import dotenv from "dotenv";
import express, { json } from "express";
import { Request, Response } from "express";
import cors from "cors";
import adminRoutes from "./routes/admin.js";
dotenv.config();
const PORT = process.env.PORT || 5006;
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

app.use("/api/v1/admin", adminRoutes);

app.use("/api/health", (req: Request, res: Response) => {
    res.json(`Server health check  200 All OK`)
});

app.listen(PORT, () => {
    console.log(`Admin service is running at port : ${PORT}`);
});