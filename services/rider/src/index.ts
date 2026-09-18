import "dotenv/config";

import express from "express";
import cors from "cors";
import connectToDB from "./config/db.js";
import riderRoutes from "./routes/rider.js";
import { connectToRabbitMQ } from "./config/rabbitmq.js";
import { startOrderReadyConsumer } from "./config/orderReady.consumer.js";

// Comma-separated list so a deployment can allow both the production frontend
// and a local dev server. Defaults to Vite's dev origin.
const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const app = express();

app.use(express.json());
app.use(
    cors({
        origin: allowedOrigins,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

const PORT = Number(process.env.PORT) || 5005;

await connectToDB();

try {
    await connectToRabbitMQ();
    await startOrderReadyConsumer();
} catch (error) {
    console.error("Rider service could not start RabbitMQ consumer :", error instanceof Error ? error.message : error);
    process.exit(1);
}

app.use("/api/rider", riderRoutes);

app.listen(PORT, () => {
    console.log(`Rider service is running at port ${PORT}`);
});
