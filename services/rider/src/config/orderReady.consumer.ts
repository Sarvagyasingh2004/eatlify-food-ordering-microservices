import { getChannel } from "./rabbitmq.js";
import { emitToRoom } from "./realtime.js";
import { Rider } from "../models/Rider.js";
import { PermanentFailure, processWithDlq } from "./dlq.js";

type OrderReadyEvent = {
    type?: string;
    data?: {
        orderId?: string;
        restaurantId?: string;
        location?: { type: "Point"; coordinates: [number, number] };
    };
};

export const startOrderReadyConsumer = async () => {
    const channel = getChannel();
    const queue = process.env.ORDER_READY_QUEUE!;

    console.log("Starting to consume from :", queue);

    await channel.consume(queue, (msg) => {
        if (!msg) return;

        void processWithDlq<OrderReadyEvent>(channel, queue, msg, async (event) => {
            if (event.type !== "ORDER_READY_FOR_RIDER") {
                throw new PermanentFailure(`unexpected event type: ${String(event.type)}`);
            }

            const { orderId, restaurantId, location } = event.data ?? {};

            if (!orderId || !restaurantId || !location) {
                throw new PermanentFailure("ORDER_READY_FOR_RIDER is missing orderId, restaurantId or location");
            }

            const riders = await Rider.find({
                isAvailable: true,
                isVerified: true,
                location: {
                    $near: {
                        $geometry: location,
                        $maxDistance: 500,
                    },
                },
            });

            console.log(`Found ${riders.length} riders near ${JSON.stringify(location.coordinates)}`);

            if (riders.length === 0) {
                // Nobody is online nearby. Not a failure - retrying would not
                // conjure a rider, and the order stays claimable when one appears.
                console.log(`No riders available for order ${orderId}`);
                return;
            }

            // emitToRoom swallows its own failures, so one unreachable rider does
            // not stop the rest being notified
            await Promise.all(
                riders.map((rider) =>
                    emitToRoom("order:available", `user:${rider.userId}`, { orderId, restaurantId }),
                ),
            );

            console.log(`Notified ${riders.length} rider(s) about order ${orderId}`);
        });
    });
};
