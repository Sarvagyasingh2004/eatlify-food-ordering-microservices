import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import Restaurant from "../models/Restaurant.js";
import axios from "axios";
import getBuffer from "../config/dataUri.js";
import MenuItems from "../models/MenuItems.js";
import { cacheDel, cacheGet, cacheSet } from "../config/redis.js";

// Menus are read on every restaurant page view and change rarely, so they are
// cached under a deterministic key and invalidated explicitly on every mutation
// rather than left to expire.
const menuKey = (restaurantId: string) => `menu:${restaurantId}`;
const MENU_TTL_SECONDS = 600;

export const addMenuItem = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Please login"
        });
    }
    const restaurant = await Restaurant.findOne({
        ownerId: req.user._id,
    });

    if (!restaurant) {
        return res.status(404).json({
            success: false,
            message: "No restaurant found"
        });
    }
    const { name, description, price } = req.body;
    if (!name || !price) {
        return res.status(400).json({
            success: false,
            message: "Name and price are required fields"
        })
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

    const menuItem = await MenuItems.create({
        name,
        description,
        price,
        restaurantId: restaurant._id,
        image: uploadResult.url,
        isAvailable: true,
    })


    await cacheDel(menuKey(restaurant._id.toString()));

    return res.status(201).json({
        success: true,
        message: "MenuItem created successfully",
        menuItem,
    });
});


export const getAll = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const id = String(req.params.id ?? "");
    if (!id) {
        return res.status(400).json({
            success: false,
            message: "Id is required",
        });
    }

    const cached = await cacheGet<unknown[]>(menuKey(id));
    if (cached) return res.json(cached);

    const menuItems = await MenuItems.find({ restaurantId: id });
    await cacheSet(menuKey(id), menuItems, MENU_TTL_SECONDS);

    return res.json(menuItems);
});


export const deleteMenuItems = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const { itemId } = req.params;
    if (!itemId) {
        return res.status(400).json({
            success: false,
            message: "Item id is required",
        });
    }
    const menuItem = await MenuItems.findById(itemId);

    if (!menuItem) {
        return res.status(404).json({
            success: false,
            message: "No item found",
        });
    }

    const restaurant = await Restaurant.findOne({
        _id: menuItem.restaurantId,
        ownerId: req.user?._id,
    });

    if (!restaurant) {
        return res.status(404).json({
            success: false,
            message: "No restaurant found",
        });
    }

    await menuItem.deleteOne();
    await cacheDel(menuKey(menuItem.restaurantId.toString()));

    return res.json({
        messag: "Menu item deleted successfully"
    })
});


export const toggleMenuItemAvailability = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Please login"
        });
    }

    const { itemId } = req.params;
    if (!itemId) {
        return res.status(400).json({
            success: false,
            message: "Item id is required",
        });
    }

    const menuItem = await MenuItems.findById(itemId);

    if (!menuItem) {
        return res.status(404).json({
            success: false,
            message: "No item found",
        });
    }

    const restaurant = await Restaurant.findOne({
        _id: menuItem.restaurantId,
        ownerId: req.user?._id,
    });

    if (!restaurant) {
        return res.status(404).json({
            success: false,
            message: "No restaurant found",
        });
    }

    menuItem.isAvailable = !menuItem.isAvailable;
    await menuItem.save();
    await cacheDel(menuKey(menuItem.restaurantId.toString()));

    return res.status(200).json({
        status: "success",
        message: `Item marked as ${menuItem.isAvailable ? "available" : "unavailable"}`
    });
});