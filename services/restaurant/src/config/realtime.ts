import axios from "axios";

// Fire-and-forget push to a realtime room. A failed emit must never fail the
// request that triggered it — the order state is already committed by then.
export const emitToRoom = async (event: string, room: string, payload: unknown) => {
    try {
        await axios.post(`${process.env.REALTIME_SERVICE}/api/v1/internal/emit`, {
            event,
            room,
            payload,
        }, {
            headers: {
                "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
            },
        });
    } catch (error) {
        console.error(`Failed to emit ${event} to room ${room}`);
    }
};
