import "dotenv/config";

import express from "express";
import cloudinary from "./config/cloudinary.js";
import cors from "cors";
import uploadRoutes from "./routes/cloudinary.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors());

const PORT = Number(process.env.PORT) || 5003;

app.use("/api", uploadRoutes);

app.listen(PORT, () => {
    console.log(`Utils service is running at port ${PORT}`);
});