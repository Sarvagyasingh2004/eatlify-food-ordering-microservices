import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import Address from "../models/Address.js";
import mongoose from "mongoose";

export const addAddress = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(400).json({
            success: false,
            message: "Please login",
        });
    }

    const userId = req.user._id;

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized",
        });
    }

    const { mobile, formattedAddress, latitude, longitude } = req.body;

    if (!mobile || !formattedAddress || !latitude || !longitude) {
        return res.status(400).json({
            succesS: false,
            message: "Mobile, FormattedAddress, Latitude, Longitude all are required fields",
        });
    }

    const newAddress = await Address.create({
        userId: userId.toString(),
        mobile,
        formattedAddress,
        location: {
            type: "Point",
            coordinates: [Number(longitude), Number(latitude)],
        }
    });

    return res.status(201).json({
        success: true,
        message: "Address created successfully",
    });

});

export const deleteAddress = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(400).json({
            success: false,
            message: "Please login",
        });
    }

    const userId = req.user._id;

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized",
        });
    }

    const { id } = req.params;
    if (!id) {
        return res.status(400).json({
            success: false,
            message: "Id is required",
        });
    }
    const address = await Address.findOne({
        _id: id.toString(),
        userId: userId.toString(),
    });

    if (!address) {
        return res.status(404).json({
            succes: false,
            message: "Address not found",
        })
    }

    await Address.deleteOne({
        _id: id.toString(),
    })

    return res.status(204).json({
        success: true,
        message: "Address deleted successfully",
    });
});

export const getAllAddresses = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(400).json({
            success: false,
            message: "Please login",
        });
    }

    const userId = req.user._id;

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized",
        });
    }

    const addresses = await Address.find({
        userId: userId.toString(),
    }).sort({ createdAt: -1 });

    return res.status(200).json({
        success: true,
        addresses,
    })
});
