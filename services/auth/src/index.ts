import dotenv from "dotenv";
import express from "express";
import connectToDB from "./config/db.js";
import authRoute from "./routes/auth.js"
import { Request, Response } from "express";
import cors from "cors";
dotenv.config();
const PORT = process.env.PORT || 5000;
// Comma-separated list so a deployment can allow both the production frontend
// and a local dev server. Defaults to Vite's dev origin.
const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const app = express();


app.use(
    cors({
        origin: allowedOrigins,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);
app.use(express.json());

app.use("/api/auth", authRoute);
app.use("/api/health", (req: Request, res: Response) => {
    res.json(`Server health check  200 All OK`)
});

app.listen(PORT, () => {
    connectToDB();
    console.log(`Auth service is running at port : ${PORT}`);
}) 