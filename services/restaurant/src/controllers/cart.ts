import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import mongoose from "mongoose";
import Cart from "../models/Cart.js";
import { json } from "stream/consumers";

export const addToCart = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(400).json({
            success: false,
            message: "Please login",
        });
    }

    const userId = req.user._id;

    const { restaurantId, itemId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(restaurantId) || !mongoose.Types.ObjectId.isValid(itemId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid restaurantId and itemId",
        });
    }

    const cartFromDifferentRestaurant = await Cart.findOne({
        userId,
        restaurantId: { $ne: restaurantId },
    });

    if (cartFromDifferentRestaurant) {
        return res.status(400).json({
            success: false,
            message: "Please clear your cart before ordering from another restaurant",
        });
    }

    const cartItem = await Cart.findOneAndUpdate({
        userId,
        restaurantId,
        itemId,
    }, {
        $inc: { quantity: 1 },
        $setOnInsert: { userId, restaurantId, itemId },
    }, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
    });

    return res.status(200).json({
        success: true,
        message: "Item added to cart",
        cart: cartItem
    })

});


export const fetchMyCart = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(400).json({
            success: false,
            message: "Please login",
        });
    }

    const userId = req.user._id;

    const cartItems = await Cart.find({
        userId,
    }).populate("itemId").populate("restaurantId");

    let subTotal = 0;
    let cartLength = 0;

    for (const cartItem of cartItems) {
        const item: any = cartItem.itemId;
        subTotal += item.price * cartItem.quantity;
        cartLength += cartItem.quantity;
    }

    return res.status(200).json({
        succes: true,
        cartLength,
        subTotal,
        cart: cartItems
    });
});

export const incrementCartItem = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(400).json({
            success: false,
            message: "Please login",
        });
    }

    const userId = req.user._id;

    const { itemId } = req.body;

    if (!userId || !itemId) {
        return res.status(400).json({
            success: false,
            message: "Invalid request",
        });
    }

    const cartItem = await Cart.findOneAndUpdate({
        userId,
        itemId,
    }, {
        $inc: { quantity: 1 },
    }, {
        new: true
    });

    if (!cartItem) {
        return res.status(404).json({
            success: false,
            message: "Item not found",
        });
    }

    return res.status(200).json({
        success: true,
        message: "Item quantity incremented successfully",
        cartItem,
    });
});

export const decrementCartItem = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(400).json({
            success: false,
            message: "Please login",
        });
    }

    const userId = req.user._id;

    const { itemId } = req.body;

    if (!userId || !itemId) {
        return res.status(400).json({
            success: false,
            message: "Invalid request",
        });
    }

    const cartItem = await Cart.findOne({ userId, itemId });

    if (!cartItem) {
        return res.status(404).json({
            success: false,
            message: "Item not found",
        });
    }

    if (cartItem?.quantity === 1) {
        await Cart.deleteOne({ userId, itemId });
        return res.status(204).json({
            success: false,
            message: "Item removed from cart",
        });
    }

    cartItem.quantity -= 1;
    await cartItem?.save();

    return res.status(200).json({
        success: true,
        message: "Item quantity decremented successfully",
        cartItem,
    });
});

export const clearCart = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
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

    await Cart.deleteMany({ userId });

    return res.status(204).json({
        success: true,
        message: "Cart cleared successfully"
    })
}); 