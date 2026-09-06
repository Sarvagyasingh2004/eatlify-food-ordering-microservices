import { Request, Response } from "express";
import TryCatch from "../middlewares/trycatch.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import Restaurant from "../models/Restaurant.js";
import getBuffer from "../config/dataUri.js";
import axios from "axios";
import jwt from "jsonwebtoken";

export const addRestaurant = TryCatch(async (req: AuthenticatedRequest, res: Response) => {

    const user = req.user;

    if (!user) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized",
        })
    }

    const existingRestaurant = await Restaurant.findOne({
        ownerId: user?._id,
    });

    if (existingRestaurant) {
        return res.status(400).json({
            success: false,
            message: "You already have a restaurant registered with us"
        });
    }

    const { name, description, latitude, longitude, formattedAddress, phone } = req.body;

    if (!name || latitude === undefined || longitude === undefined) {
        return res.status(400).json({
            success: false,
            message: "Fields name, latitude and longitude are required"
        });
    }

    const file = req.file;

    if (!file) {
        return res.status(400).json({
            success: false,
            message: "File is required"
        });
    }

    const fileBuffer = getBuffer(file);

    if (!fileBuffer) {
        return res.status(500).json({
            success: false,
            message: "Internal server error, failed to create file buffer"
        });
    }

    const { data: uploadResult } = await axios.post(`${process.env.UTILS_SERVICE}/api/upload`, {
        buffer: fileBuffer.content,
    });

    const restaurant = await Restaurant.create({
        name,
        description,
        phone,
        image: uploadResult.url,
        ownerId: user._id,
        autoLocation: {
            type: "Point",
            coordinates: [Number(longitude), Number(latitude)],
            formattedAddress,
        },
        isVerified: false,
    });

    return res.status(201).json({
        success: true,
        message: "Restaurant created successfully"
    });

});


export const fetchMyRestaurant = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Please login",
        });
    }

    const restaurant = await Restaurant.findOne({
        ownerId: req.user._id,
    });

    if (!restaurant) {
        return res.status(404).json({
            success: false,
            message: "No restaurant found",
        });
    }

    if (!req.user.restaurantId) {
        const token = jwt.sign({
            user: {
                ...req.user,
                restaurantId: restaurant._id,
            }
        },
            process.env.JWT_SECRET as string, {
            expiresIn: "15d"
        });

        return res.status(200).json({
            success: true,
            token,
            restaurant,
        });
    }
    return res.status(200).json({
        success: true,
        restaurant,
    });
});


export const updateRestaurantStatus = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(403).json({
            success: false,
            message: "Please login"
        });
    }
    const { status } = req.body;
    if (typeof status !== "boolean") {
        return res.status(400).json({
            success: false,
            message: "Status must be boolean"
        });
    }

    const restaurant = await Restaurant.findOneAndUpdate({
        ownerId: req.user._id,
    }, {
        isOpen: status,
    }, {
        new: true
    });

    if (!restaurant) {
        return res.status(404).json({
            success: false,
            message: "Restaurant not found"
        });
    }

    return res.status(203).json({
        success: true,
        message: "Restaurant status updated successfully",
        restaurant
    });
});

export const updateRestaurant = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(403).json({
            success: false,
            message: "Please login"
        });
    }
    const { name, description } = req.body;

    const restaurant = await Restaurant.findOneAndUpdate({
        ownerId: req.user._id,
    }, {
        name,
        description,
    }, {
        new: true
    });

    if (!restaurant) {
        return res.status(404).json({
            success: false,
            message: "Restaurant not found"
        });
    }

    return res.status(203).json({
        success: true,
        message: "Restaurant updated successfully",
        restaurant
    });
});


export const getNearbyRestaurants = TryCatch(async (req: Request, res: Response) => {
    const { latitude, longitude, radius = 5000, search = "" } = req.query;

    if (!latitude || !longitude) {
        return res.status(400).json({
            success: false,
            message: "Latitude and longitude are required",
        });
    }

    const query: any = {
        isVerified: true,
    }

    if (search && typeof search == "string") {
        query.name = { $regex: search, $options: "i " };
    }

    const restaurants = await Restaurant.aggregate([
        {
            $geoNear: {
                near: {
                    type: "Point",
                    coordinates: [Number(longitude), Number(latitude)]
                },
                distanceField: "distance",
                maxDistance: Number(radius),
                spherical: true,
                query,
            },
        },
        {
            $sort: {
                isOpen: -1,
                distance: 1,
            }
        },
        {
            $addFields: {
                distanceKm: {
                    $round: [{ $divide: ["$distance", 1000] }, 2]
                }
            }
        }
    ]);

    res.json({
        success: true,
        count: restaurants.length,
        restaurants,
    })
});


export const fetchSingleRestaurant = TryCatch(async (req: Request, res: Response) => {
    const restaurant = await Restaurant.findById(req.params.id);
    return res.json({
        success: true,
        restaurant,
    });
});