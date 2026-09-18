import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import getBuffer from "../config/dataUri.js";
import axios from "axios";
import { Rider } from "../models/Rider.js";
import { emitToRoom } from "../config/realtime.js";

export const addRiderProfile = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized",
        });
    }

    if (user.role !== "rider") {
        return res.status(403).json({
            success: false,
            message: "Forbidden, Only riders can create rider profile",
        });
    }

    const file = req.file;

    if (!file) {
        return res.status(400).json({
            success: false,
            message: "Rider image is required",
        });
    }

    const fileBuffer = getBuffer(file);

    if (!fileBuffer?.content) {
        return res.status(500).json({
            success: false,
            message: "Failed to generate image buffer",
        });
    }

    const { data: uploadResult } = await axios.post(`${process.env.UTILS_SERVICE}/api/upload`, {
        buffer: fileBuffer.content,
    });

    const { phoneNumber, aadharNumber, drivingLicenseNumber, latitude, longitude } = req.body;
    if (!phoneNumber || !aadharNumber || !drivingLicenseNumber || latitude === undefined || longitude === undefined) {
        return res.status(400).json({
            success: false,
            message: "All fields are required",
        });
    }

    const existingRiderProfile = await Rider.findOne({ userId: user._id });

    if (existingRiderProfile) {
        return res.status(400).json({
            success: false,
            message: "Rider profile already exists",
        });
    }

    const riderProfile = await Rider.create({
        userId: user._id,
        picture: uploadResult.url,
        phoneNumber,
        aadharNumber,
        drivingLicenseNumber,
        location: {
            type: "Point",
            coordinates: [longitude, latitude],
        },
        isAvailable: false,
        isVerified: false,
    });

    return res.status(201).json({
        success: true,
        message: "Rider profile created successfully",
        riderProfile,
    })
});


export const fetchMyprofile = TryCatch(async (req: AuthenticatedRequest, res: Response) => {

    const user = req.user;

    if (!user) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized",
        });
    }

    const riderProfile = await Rider.findOne({ userId: user._id.toString() });

    if (!riderProfile) {
        return res.status(404).json({
            success: false,
            message: "Rider not found",
        });
    }

    return res.status(200).json(riderProfile);
});


export const toggleRiderAvailability = TryCatch(async (req: AuthenticatedRequest, res: Response) => {

    const user = req.user;

    if (!user) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized",
        });
    }

    const { isAvailable, latitude, longitude } = req.body;

    if (typeof isAvailable != "boolean") {
        return res.status(400).json({
            success: false,
            message: "isAvailable must be boolean",
        });
    }

    if (typeof latitude !== "number" || typeof longitude !== "number") {
        return res.status(400).json({
            success: false,
            message: "location required",
        });
    }

    const riderProfile = await Rider.findOne({ userId: user._id.toString() });

    if (!riderProfile) {
        return res.status(404).json({
            success: false,
            message: "Rider not found",
        });
    }

    if (isAvailable && !riderProfile.isVerified) {
        return res.status(403).json({
            success: false,
            message: "Rider is not verified",
        });
    }

    riderProfile.isAvailable = isAvailable;

    riderProfile.location = {
        type: "Point",
        coordinates: [longitude, latitude],
    };

    riderProfile.lastActiveAt = new Date();

    await riderProfile.save();

    await emitToRoom("rider:status", `user:${riderProfile.userId}`, {
        isAvailable: riderProfile.isAvailable,
    });

    return res.status(200).json({
        success: true,
        message: isAvailable ? "Rider is now online" : "Rider went offline",
        isAvailable: riderProfile.isAvailable,
    });

});

export const acceptOrder = TryCatch(async (req: AuthenticatedRequest, res: Response) => {

    const riderUserId = req.user?._id;

    const { orderId } = req.params;

    if (!riderUserId) {
        return res.status(400).json({
            success: false,
            message: "Please login",
        });
    }

    const rider = await Rider.findOne({ userId: riderUserId, isAvailable: true });

    if (!rider) {
        return res.status(404).json({
            success: false,
            message: "Rider not found",
        });
    }

    try {
        const { data } = await axios.put(`${process.env.RESTAURANT_SERVICE}/api/order/assign/rider`, {
            orderId,
            riderId: rider._id.toString(),
            // the rider's display name comes from their account, not their photo
            riderName: req.user?.name,
            riderPhone: rider.phoneNumber,
        }, {
            headers: {
                "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
            },
        });

        if (!data.success) {
            return res.status(400).json({
                success: false,
                message: data.message ?? "Could not accept this order",
            });
        }

        await Rider.findOneAndUpdate({ userId: rider.userId, isAvailable: true }, {
            isAvailable: false,
        }, { new: true });

        await emitToRoom("rider:status", `user:${rider.userId}`, {
            isAvailable: false,
        });

        return res.status(200).json({
            success: true,
            message: "Order accepted",
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "Order already taken",
        });
    }
});

export const fetchMyCurrentOrder = TryCatch(async (req: AuthenticatedRequest, res: Response) => {

    const riderUserId = req.user?._id;

    if (!riderUserId) {
        return res.status(400).json({
            success: false,
            message: "Please login",
        });
    }

    const rider = await Rider.findOne({ userId: riderUserId, isVerified: true });

    if (!rider) {
        return res.status(404).json({
            success: false,
            message: "Rider not found",
        });
    }

    try {
        const { data } = await axios.get(`${process.env.RESTAURANT_SERVICE}/api/order/current/rider?riderId=${rider._id}`, {
            headers: {
                "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
            },
        });

        return res.status(200).json({
            success: true,
            message: "Current Order fetched successfully",
            order: data,
        });
    } catch (error: any) {
        if (error.response?.status === 404) {
            return res.status(200).json({
                success: true,
                message: "No active order",
                order: null,
            });
        }

        return res.status(500).json({
            success: false,
            message: error.response?.data?.message ?? "Failed to fetch current order",
        });
    }
});

export const updateOrderStatus = TryCatch(async (req: AuthenticatedRequest, res: Response) => {

    const riderUserId = req.user?._id;

    if (!riderUserId) {
        return res.status(400).json({
            success: false,
            message: "Please login",
        });
    }

    const rider = await Rider.findOne({ userId: riderUserId });

    if (!rider) {
        return res.status(404).json({
            success: false,
            message: "Rider not found",
        });
    }

    const { orderId } = req.params;

    try {
        const { data } = await axios.put(`${process.env.RESTAURANT_SERVICE}/api/order/update/status/rider`, {
            orderId,
            riderId: rider._id.toString(),
        }, {
            headers: {
                "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
            },
        });

        // the delivery is over, so put the rider back in the available pool
        if (data.status === "delivered") {
            rider.isAvailable = true;
            rider.lastActiveAt = new Date();
            await rider.save();

            await emitToRoom("rider:status", `user:${rider.userId}`, {
                isAvailable: true,
            });
        }

        return res.status(200).json({
            success: true,
            message: data.message,
            status: data.status,
        });

    } catch (error: any) {
        return res.status(error.response?.status ?? 500).json({
            success: false,
            message: error.response?.data?.message ?? "Internal server error",
        });
    }

});


// Replaces the browser calling the realtime service directly with the shared
// internal key - that key was compiled into the bundle and let anyone emit to
// any room. The client no longer names a room: we derive it from the order the
// rider is actually carrying, so a rider can only ever broadcast to their own
// customer.
export const updateRiderLocation = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const riderUserId = req.user?._id;

    if (!riderUserId) {
        return res.status(401).json({
            success: false,
            message: "Please login",
        });
    }

    const { latitude, longitude } = req.body;

    if (typeof latitude !== "number" || typeof longitude !== "number") {
        return res.status(400).json({
            success: false,
            message: "latitude and longitude are required",
        });
    }

    const rider = await Rider.findOne({ userId: riderUserId.toString() });

    if (!rider) {
        return res.status(404).json({
            success: false,
            message: "Rider not found",
        });
    }

    rider.location = { type: "Point", coordinates: [longitude, latitude] };
    rider.lastActiveAt = new Date();
    await rider.save();

    let order = null;

    try {
        const { data } = await axios.get(`${process.env.RESTAURANT_SERVICE}/api/order/current/rider?riderId=${rider._id}`, {
            headers: {
                "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
            },
        });
        order = data;
    } catch (error) {
        // no active delivery, so there is nobody to notify
        return res.status(200).json({
            success: true,
            message: "Location saved",
            tracked: false,
        });
    }

    await emitToRoom("rider:location", `user:${order.userId}`, { latitude, longitude });

    return res.status(200).json({
        success: true,
        message: "Location shared with customer",
        tracked: true,
    });
});

// Orders live in the restaurant service, so we resolve the rider here and let
// it do the querying.
const fetchFromOrders = async (path: string) => {
    const { data } = await axios.get(`${process.env.RESTAURANT_SERVICE}${path}`, {
        headers: {
            "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
        },
    });
    return data;
};

const resolveRider = async (req: AuthenticatedRequest) => {
    const riderUserId = req.user?._id;
    if (!riderUserId) return null;
    return Rider.findOne({ userId: riderUserId.toString() });
};

export const fetchMyCompletedOrders = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const rider = await resolveRider(req);

    if (!rider) {
        return res.status(404).json({
            success: false,
            message: "Rider not found",
        });
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const data = await fetchFromOrders(
        `/api/order/rider/completed?riderId=${rider._id}&page=${page}&limit=${limit}`,
    );

    return res.status(200).json(data);
});

export const fetchMyEarnings = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const rider = await resolveRider(req);

    if (!rider) {
        return res.status(404).json({
            success: false,
            message: "Rider not found",
        });
    }

    const range = typeof req.query.range === "string" ? req.query.range : "all";

    const data = await fetchFromOrders(
        `/api/order/rider/earnings?riderId=${rider._id}&range=${range}`,
    );

    return res.status(200).json(data);
});
