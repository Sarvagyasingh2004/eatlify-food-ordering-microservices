import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { initSocket } from "./socket.js";
import internalRoute from "./routes/internal.js";

// Comma-separated list so a deployment can allow both the production frontend
// and a local dev server. Defaults to Vite's dev origin.
const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const app = express();

const PORT = Number(process.env.PORT) || 5004;

const server = http.createServer(app);

app.use(express.json());
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(
    cors({
        origin: allowedOrigins,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

initSocket(server);

app.use("/api/v1/internal", internalRoute);

server.listen(PORT, () => {
    console.log(`Realtime service is running at port ${PORT}`);
});

