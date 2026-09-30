import Order from "../models/Order.js";
import { emitToRoom } from "./realtime.js";
import { getChannel } from "./rabbitmq.js";
import { PermanentFailure, processWithDlq } from "./dlq.js";

type PaymentEvent = {
    type?: string;
    data?: { orderId?: string; paymentId?: string; provider?: string };
};

export const startPaymentConsumer = async () => {
    const channel = getChannel();
    const queue = process.env.PAYMENT_QUEUE!;

    await channel.consume(queue, (msg) => {
        if (!msg) return;

        void processWithDlq<PaymentEvent>(channel, queue, msg, async (event) => {
            if (event.type !== "PAYMENT_SUCCESS") {
                // not ours and never will be - no amount of retrying changes that
                throw new PermanentFailure(`unexpected event type: ${String(event.type)}`);
            }

            const orderId = event.data?.orderId;

            if (!orderId) {
                throw new PermanentFailure("PAYMENT_SUCCESS carried no orderId");
            }

            // The conditional match is the idempotency guard: the first delivery
            // flips the order to paid, a duplicate matches nothing. Check and
            // write are one atomic operation, so there is no window between them.
            const order = await Order.findOneAndUpdate(
                {
                    _id: orderId.toString(),
                    paymentStatus: { $ne: "paid" },
                },
                {
                    $set: { paymentStatus: "paid", status: "placed" },
                    $unset: { expiresAt: 1 },
                },
                { new: true },
            );

            if (!order) {
                // Already paid, or the order is gone. Either way this message has
                // nothing left to do - treat it as handled rather than retrying.
                console.log(`Order ${orderId} already paid or missing, skipping`);
                return;
            }

            console.log(`Order with id : ${orderId} placed successfully`);

            await emitToRoom("order:new", `restaurant:${order.restaurantId}`, {
                order: order._id,
            });
        });
    });

    console.log(`Payment consumer listening on ${queue}`);
};
