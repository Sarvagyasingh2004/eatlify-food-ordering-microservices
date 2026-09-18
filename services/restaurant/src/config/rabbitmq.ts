import amqp from "amqplib";

let channel: amqp.Channel;

export const connectToRabbitMQ = async () => {
    const connection = await amqp.connect(process.env.RABBITMQ_URL!);

    channel = await connection.createChannel();

    await channel.assertQueue(process.env.PAYMENT_QUEUE!, {
        durable: true, //retry after failure
    });

    await channel.assertQueue(process.env.RIDER_QUEUE!, {
        durable: true,
    })

    await channel.assertQueue(process.env.ORDER_READY_QUEUE!, {
        durable: true,
    });

    console.log("RabbitMQ connected successfully");
}

export const getChannel = () => channel;