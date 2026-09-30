import amqp from "amqplib";
import { dlqName } from "./dlq.js";

let channel: amqp.Channel | undefined;

const envInt = (name: string, fallback: number) => {
    const value = Number(process.env[name]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
};

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

        const orderReadyQueue = process.env.ORDER_READY_QUEUE!;

        await channel.assertQueue(orderReadyQueue, { durable: true });
        await channel.assertQueue(dlqName(orderReadyQueue), { durable: true });

        // bounds how many messages a retrying handler can hold in memory at once
        await channel.prefetch(envInt("CONSUMER_PREFETCH", 10));

        console.log("RabbitMQ connected successfully");
    } catch (error) {
        console.error("Failed to connect to RabbitMQ :", error);
        throw error;
    }
};

export const getChannel = () => {
    if (!channel) {
        throw new Error("RabbitMQ channel is not ready - call connectToRabbitMQ() first");
    }

    return channel;
};
