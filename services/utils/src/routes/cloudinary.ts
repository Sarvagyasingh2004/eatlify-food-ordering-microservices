import express, { Request, Response } from "express";
import cloudinary from "../config/cloudinary.js";

const router = express.Router();

router.post("/upload", async (req: Request, res: Response) => {
    try {
        const { buffer } = req.body;
        const { secure_url } = await cloudinary.uploader.upload(buffer);

        res.status(200).json({
            url: secure_url,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

export default router;

