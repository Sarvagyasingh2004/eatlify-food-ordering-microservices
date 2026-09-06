import dotenv from "dotenv";
import express from "express";
import connectToDB from "./config/db.js";
import authRoute from "./routes/auth.js"
import { Request, Response } from "express";
import cors from "cors";
dotenv.config();
const PORT = process.env.PORT || 5000;
const app = express();


app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoute);
app.use("/api/health", (req: Request, res: Response) => {
    res.json(`Server health check  200 All OK`)
});

app.listen(PORT, () => {
    connectToDB();
    console.log(`Auth service is running at port : ${PORT}`);
}) 