import amqp from "amqplib";
import { dlqName } from "./dlq.js";

let channel: amqp.Channel;

const envInt = (name: string, fallback: number) => {
    const value = Number(process.env[name]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
};

export const connectToRabbitMQ = async () => {
    const connection = await amqp.connect(process.env.RABBITMQ_URL!);

    connection.on("error", (error) => {
        console.error("RabbitMQ connection error:", error);
    });

    connection.on("close", () => {
        console.error("RabbitMQ connection closed");
    });

    channel = await connection.createChannel();

    channel.on("error", (error) => {
        console.error("RabbitMQ channel error:", error);
    });

    // durable so the queue survives a broker restart; messages are published
    // with persistent: true so they survive with it
    const paymentQueue = process.env.PAYMENT_QUEUE!;
    const orderReadyQueue = process.env.ORDER_READY_QUEUE!;

    await channel.assertQueue(paymentQueue, { durable: true });
    await channel.assertQueue(orderReadyQueue, { durable: true });

    // Declared with no arguments so they can never collide with an existing
    // declaration. Undeliverable messages are published here explicitly.
    await channel.assertQueue(dlqName(paymentQueue), { durable: true });
    await channel.assertQueue(dlqName(orderReadyQueue), { durable: true });

    // A handler can now hold a message for seconds while it retries, so cap how
    // many are in flight - otherwise the broker pushes the whole queue at once.
    await channel.prefetch(envInt("CONSUMER_PREFETCH", 10));

    console.log("RabbitMQ connected successfully");
};

export const getChannel = () => channel;
