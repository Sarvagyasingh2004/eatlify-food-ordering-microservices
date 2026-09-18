import amqp from "amqplib";

let channel: amqp.Channel | undefined;

export const connectToRabbitMQ = async () => {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL!);

        connection.on("error", (error) => {
            console.error("RabbitMQ connection error :", error);
        });

        connection.on("close", () => {
            console.error("RabbitMQ connection closed");
        });

        channel = await connection.createChannel();

        channel.on("error", (error) => {
            console.error("RabbitMQ channel error :", error);
        });

        await channel.assertQueue(process.env.RIDER_QUEUE!, {
            durable: true,
        });

        await channel.assertQueue(process.env.ORDER_READY_QUEUE!, {
            durable: true,
        });

        console.log("RabbitMQ connected successfully");
    } catch (error) {
        console.error("Failed to connect to RabbitMQ :", error);
        throw error;
    }
}

export const getChannel = () => {
    if (!channel) {
        throw new Error("RabbitMQ channel is not ready - call connectToRabbitMQ() first");
    }

    return channel;
};
