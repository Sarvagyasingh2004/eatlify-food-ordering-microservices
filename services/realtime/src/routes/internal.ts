import express from "express";
import { getIO } from "../socket.js";

const router = express.Router();

router.post("/emit", (req, res) => {
    if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
        return res.status(403).json({
            success: false,
            message: "Forbidden",
        });
    }

    const { event, room, payload } = req.body;

    if (!event || !room) {
        return res.status(400).json({
            success: false,
            message: "Event and room are required",
        });
    }
    const io = getIO();
    console.log(`Emitting event ${event} to room ${room}`);

    io.to(room).emit(event, payload ?? {});

    return res.status(200).json({
        success: true,
    });
});

export default router;