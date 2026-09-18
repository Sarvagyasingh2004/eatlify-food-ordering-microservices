import "dotenv/config";

import express from "express";
import cors from "cors";
import { connectToRabbitMQ } from "./config/rabbitmq.js";
import uploadRoutes from "./routes/cloudinary.js";
import paymentRoutes from "./routes/payment.js";

connectToRabbitMQ();


// Comma-separated list so a deployment can allow both the production frontend
// and a local dev server. Defaults to Vite's dev origin.
const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(
    cors({
        origin: allowedOrigins,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

const PORT = Number(process.env.PORT) || 5003;

app.use("/api", uploadRoutes);
app.use("/api/payment", paymentRoutes);

app.listen(PORT, () => {
    console.log(`Utils service is running at port ${PORT}`);
});