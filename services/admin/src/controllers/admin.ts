import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import TryCatch from "../middlewares/trycatch.js";
import { getRestaurantCollection, getRiderCollection } from "../utils/collection.js";

export const getPendingRestaurants = TryCatch(async (req: Request, res: Response) => {
    const restaurants = await (await getRestaurantCollection()).find({ isVerified: false }).toArray();
    res.status(200).json({
        success: true,
        count: restaurants.length,
        restaurants,
    });
});

export const getPendingRiders = TryCatch(async (req: Request, res: Response) => {
    const riders = await (await getRiderCollection()).find({ isVerified: false }).toArray();
    res.status(200).json({
        success: true,
        count: riders.length,
        riders,
    });
});

export const verifyRestaurant = TryCatch(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (typeof id !== "string") {
        return res.status(400).json({
            success: false,
            message: "Invalid restaurant id",
        });
    }

    if (!ObjectId.isValid(id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid object id",
        });
    }

    const restaurant = await (await getRestaurantCollection()).updateOne(
        {
            _id: new ObjectId(id),

        }, {
        $set: {
            isVerified: true,
            updatedAt: new Date(),
        }
    });

    if (restaurant.matchedCount === 0) {
        return res.status(404).json({
            success: false,
            message: "Restaurant not found",
        });
    }

    res.status(200).json({
        success: true,
        message: "Restaurant verified successfully",
    });
});

export const verifyRider = TryCatch(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (typeof id !== "string") {
        return res.status(400).json({
            success: false,
            message: "Invalid rider id",
        });
    }

    if (!ObjectId.isValid(id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid object id",
        });
    }

    const rider = await (await getRiderCollection()).updateOne(
        {
            _id: new ObjectId(id),

        }, {
        $set: {
            isVerified: true,
            updatedAt: new Date(),
        }
    });

    if (rider.matchedCount === 0) {
        return res.status(404).json({
            success: false,
            message: "Rider not found",
        });
    }

    res.status(200).json({
        success: true,
        message: "Rider verified successfully",
    });
});