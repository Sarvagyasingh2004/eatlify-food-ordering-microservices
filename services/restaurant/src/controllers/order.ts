import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import Address from "../models/Address.js";
import Cart from "../models/Cart.js";
import { IMenuItem } from "../models/MenuItems.js";
import Restaurant, { IRestaurant } from "../models/Restaurant.js";
import Order, { IOrder } from "../models/Order.js";
import { publishEvent } from "../config/order.publisher.js";
import { emitToRoom } from "../config/realtime.js";

// The platform takes a cut of the food total on top of the flat platformFee the
// customer already pays. Not per-restaurant configurable yet; promote to the
// Restaurant model if that ever becomes a requirement.
export const PLATFORM_COMMISSION_RATE = 0.2;

// A seller may only ever read or act on a restaurant they own. Returns the
// restaurant, or the status/message to reject with.
const resolveOwnedRestaurant = async (restaurantId: string, userId: string) => {
    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
        return { restaurant: null, status: 404, message: "Restaurant not found" };
    }

    if (restaurant.ownerId !== userId) {
        return { restaurant: null, status: 403, message: "You do not own this restaurant" };
    }

    return { restaurant, status: 200, message: "" };
};

export const createOrder = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized",
        });
    }

    const { paymentMethod, addressId } = req.body;

    if (!addressId) {
        return res.status(400).json({
            success: false,
            message: "Address is required",
        });
    }

    const address = await Address.findOne({
        _id: addressId,
        userId: user._id,
    });

    if (!address) {
        return res.status(404).json({
            success: false,
            message: "Address not found",
        });
    }

    const getDistanceInKilometers = (lat1: number, long1: number, lat2: number, long2: number): number => {
        const R = 6371;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLong = ((long2 - long1) * Math.PI) / 180;

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLong / 2) * Math.sin(dLong / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return +(R * c).toFixed(2);
    }

    const cartItems = await Cart.find({
        userId: user._id,
    }).populate<{ itemId: IMenuItem }>("itemId").populate<{ restaurantId: IRestaurant }>("restaurantId");

    if (cartItems.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Cart is empty",
        });
    }

    const firstCartItem = cartItems[0];

    if (!firstCartItem || !firstCartItem.restaurantId) {
        return res.status(400).json({
            success: false,
            message: "Invalid cart data",
        });
    }

    const restaurantId = firstCartItem.restaurantId._id;
    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
        return res.status(404).json({
            success: false,
            message: "No restaurant found with this id",
        });
    }

    if (!restaurant.isOpen) {
        return res.status(400).json({
            success: false,
            message: "Sorry this restaurant is closed for now",
        });
    }

    const distance = getDistanceInKilometers(address.location.coordinates[1], address.location.coordinates[0], restaurant.autoLocation.coordinates[1], restaurant.autoLocation.coordinates[0]);

    let subTotal = 0;
    const orderItems = cartItems.map((cart) => {
        const item = cart.itemId;

        if (!item) {
            throw new Error("Invalid cart item");
        }

        const itemTotal = item.price * cart.quantity;

        subTotal += itemTotal;

        return {
            itemId: item._id.toString(),
            name: item.name,
            price: item.price,
            quantity: cart.quantity,
        }
    });

    const deliveryFee = subTotal < 250 ? 49 : 0;
    const platformFee = 7;
    const totalAmount = subTotal + deliveryFee + platformFee;

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const [longitude, latitude] = address.location.coordinates;

    const riderAmount = Math.ceil(distance) * 17;

    const order = await Order.create({
        userId: user._id.toString(),
        restaurantId: restaurantId.toString(),
        riderName: null,
        restaurantName: restaurant.name,
        distance,
        riderId: null,
        riderPhone: null,
        riderAmount,
        items: orderItems,
        subTotal,
        deliveryFee,
        platformFee,
        totalAmount,
        addressId: address?._id.toString(),
        deliveryAddress: {
            formattedAddress: address.formattedAddress,
            mobile: address.mobile,
            latitude,
            longitude,
        },
        paymentMethod,
        paymentStatus: "pending",
        status: "placed",
        expiresAt,
    });

    await Cart.deleteMany({ userId: user._id.toString() });

    return res.status(201).json({
        success: true,
        message: "Order created successfully",
        orderId: order._id.toString(),
        amount: totalAmount,
    });
});


export const fetchOrderForPayment = TryCatch(async (req: Request, res: Response) => {
    if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
        return res.status(403).json({
            success: false,
            message: "Forbidden",
        });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
        return res.status(404).json({
            success: false,
            message: "Order not found",
        });
    }

    if (order.paymentStatus !== "pending") {
        return res.status(500).json({
            success: false,
            message: "Order paid already",
        });
    }

    return res.status(200).json({
        success: true,
        message: "Order fetched successsfully",
        orderId: order._id,
        amount: order.totalAmount,
        currency: "INR",
    })
});


export const fetchRestaurantOrders = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized",
        });
    }

    const restaurantId = String(req.params.restaurantId ?? "");

    if (!restaurantId) {
        return res.status(400).json({
            success: false,
            message: "RestaurantId is required",
        });
    }

    const owned = await resolveOwnedRestaurant(restaurantId, user._id.toString());

    if (!owned.restaurant) {
        return res.status(owned.status).json({
            success: false,
            message: owned.message,
        });
    }

    const limit = req.query.limit ? Number(req.query.limit) : 0;

    const orders = await Order.find({
        restaurantId,
        paymentStatus: "paid",
    }).sort({ createdAt: -1 }).limit(limit);

    return res.status(200).json({
        success: true,
        count: orders.length,
        orders,
    });
});


const ALLOWED_STATUS = ["accepted", "preparing", "ready_for_rider"] as const;

export const updateOrderStatus = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized",
        });
    }

    const { orderId } = req.params;

    const { status } = req.body;

    if (!orderId) {
        return res.status(400).json({
            success: false,
            message: "RestaurantId is required",
        });
    }

    if (!ALLOWED_STATUS.includes(status)) {
        return res.status(400).json({
            success: false,
            message: "Invalid order status",
        });
    }

    const order = await Order.findById(orderId);

    if (!order) {
        return res.status(404).json({
            success: false,
            message: "Order not found",
        });
    }

    if (order.paymentStatus !== "paid") {
        return res.status(404).json({
            success: false,
            message: "Order not completed",
        });
    }

    const owned = await resolveOwnedRestaurant(order.restaurantId, user._id.toString());

    if (!owned.restaurant) {
        return res.status(owned.status).json({
            success: false,
            message: owned.message,
        });
    }

    const restaurant = owned.restaurant;

    order.status = status;

    await order.save();

    await emitToRoom("order:update", `user:${order.userId}`, {
        order: order._id,
        status: order.status,
    });

    if (status === "ready_for_rider") {
        console.log("Publishing order ready for rider event for order", order._id);

        await publishEvent("ORDER_READY_FOR_RIDER", {
            orderId: order._id.toString(),
            restaurantId: restaurant._id.toString(),
            location: restaurant.autoLocation,
        });

        console.log("Order ready for rider event published successfully");
    }



    res.status(200).json({
        success: true,
        message: "Order status updated successfully",
        order
    });
});


export const getMyOrders = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized",
        });
    }

    const orders = await Order.find({
        userId: req.user?._id.toString(),
        paymentStatus: "paid",
    }).sort({ createdAt: -1 });

    return res.status(200).json(orders);
});

export const fetchSingleOrder = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized",
        });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
        return res.status(404).json({
            success: false,
            message: "Order not found",
        });
    }

    if (order.userId !== req.user?._id.toString()) {
        return res.status(401).json({
            succes: false,
            message: "Unauthorized",
        });
    }

    res.json(order);

});


export const assignRiderToOrder = TryCatch(async (req: Request, res: Response) => {
    if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
        return res.status(403).json({
            success: false,
            message: "Forbidden",
        });
    }

    const { orderId, riderId, riderName, riderPhone } = req.body;

    // a cancelled order must not keep the rider locked out of new work
    const orderAvailable = await Order.findOne({
        riderId,
        status: { $nin: ["delivered", "cancelled"] },
    });

    if (orderAvailable) {
        return res.status(400).json({
            success: false,
            message: "You already have an order",
        });
    }

    const order = await Order.findById(orderId);

    if (!order) {
        return res.status(404).json({
            success: false,
            message: "Order not found",
        });
    }

    if (order.riderId !== null) {
        return res.status(400).json({
            success: false,
            message: "Order already taken",
        });
    }

    const orderUpdated = await Order.findOneAndUpdate({ _id: orderId, riderId: null }, { riderId, riderName, riderPhone, status: "rider_assigned" }, { new: true });

    // emit the updated document - the pre-update copy has no riderId or status yet
    await Promise.all([
        emitToRoom("order:rider_assigned", `user:${order.userId}`, orderUpdated),
        emitToRoom("order:rider_assigned", `restaurant:${order.restaurantId}`, orderUpdated),
    ]);

    return res.status(200).json({
        success: true,
        message: "Rider assigned successfully",
        order: orderUpdated,
    });
});

export const getCurrentOrderForRider = TryCatch(async (req: Request, res: Response) => {
    if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
        return res.status(403).json({
            success: false,
            message: "Forbidden",
        });
    }

    const { riderId } = req.query;

    if (!riderId) {
        return res.status(400).json({
            success: false,
            message: "RiderId is required",
        });
    }

    const order = await Order.findOne({
        riderId,
        status: { $nin: ["delivered", "cancelled"] },
    });

    if (!order) {
        return res.status(404).json({
            success: false,
            message: "Order not found",
        });
    }

    return res.status(200).json(order);
});

// A delivery advances one step at a time, and only the rider carrying it may
// advance it: rider_assigned -> picked_up -> delivered.
const RIDER_STATUS_FLOW: Record<string, IOrder["status"]> = {
    rider_assigned: "picked_up",
    picked_up: "delivered",
};

export const updateOrderStatusRider = TryCatch(async (req: Request, res: Response) => {
    if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
        return res.status(403).json({
            success: false,
            message: "Forbidden",
        });
    }

    const { orderId, riderId } = req.body;

    if (!riderId) {
        return res.status(400).json({
            success: false,
            message: "RiderId is required",
        });
    }

    const order = await Order.findById(orderId);

    if (!order) {
        return res.status(404).json({
            success: false,
            message: "Order not found",
        });
    }

    // without this any rider could advance any order in the system
    if (order.riderId !== riderId) {
        return res.status(403).json({
            success: false,
            message: "This order is not assigned to you",
        });
    }

    const nextStatus = RIDER_STATUS_FLOW[order.status];

    if (!nextStatus) {
        return res.status(400).json({
            success: false,
            message: `Order cannot be advanced from status "${order.status}"`,
        });
    }

    order.status = nextStatus;
    await order.save();

    // one event name carrying the status, so the client can tell pickup from delivery
    await Promise.all([
        emitToRoom("order:update", `restaurant:${order.restaurantId}`, {
            order: order._id,
            status: order.status,
        }),
        emitToRoom("order:update", `user:${order.userId}`, {
            order: order._id,
            status: order.status,
        }),
    ]);

    return res.status(200).json({
        success: true,
        message: "Order updated successfully",
        status: order.status,
    });
});


// ---------------------------------------------------------------------------
// Earnings / reporting
// ---------------------------------------------------------------------------

// Resolve a ?range= query into the earliest createdAt to include.
const rangeStart = (range: unknown): Date | null => {
    const now = new Date();

    switch (range) {
        case "today": {
            const start = new Date(now);
            start.setHours(0, 0, 0, 0);
            return start;
        }
        case "7d":
            return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case "30d":
            return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        default:
            return null;
    }
};

const round2 = (n: number) => Math.round(n * 100) / 100;

// Delivered orders are money earned. Paid orders still in flight are pending,
// and cancelled ones count as neither.
const summarise = (buckets: { _id: string; orders: number; gross: number }[]) => {
    const earnedBucket = buckets.find((b) => b._id === "delivered");
    const pendingBuckets = buckets.filter((b) => b._id !== "delivered" && b._id !== "cancelled");

    const build = (orders: number, gross: number) => {
        const commission = round2(gross * PLATFORM_COMMISSION_RATE);
        return { orders, gross: round2(gross), commission, net: round2(gross - commission) };
    };

    return {
        earned: build(earnedBucket?.orders ?? 0, earnedBucket?.gross ?? 0),
        pending: build(
            pendingBuckets.reduce((sum, b) => sum + b.orders, 0),
            pendingBuckets.reduce((sum, b) => sum + b.gross, 0),
        ),
    };
};

export const getRestaurantStats = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized",
        });
    }

    const restaurantId = String(req.params.restaurantId ?? "");

    if (!restaurantId) {
        return res.status(400).json({
            success: false,
            message: "RestaurantId is required",
        });
    }

    const owned = await resolveOwnedRestaurant(restaurantId, user._id.toString());

    if (!owned.restaurant) {
        return res.status(owned.status).json({
            success: false,
            message: owned.message,
        });
    }

    const since = rangeStart(req.query.range);

    const match: Record<string, unknown> = { restaurantId, paymentStatus: "paid" };
    if (since) match.createdAt = { $gte: since };

    // one round trip: status buckets, best sellers, and a daily series
    const [result] = await Order.aggregate([
        { $match: match },
        {
            $facet: {
                buckets: [
                    { $group: { _id: "$status", orders: { $sum: 1 }, gross: { $sum: "$subTotal" } } },
                ],
                topItems: [
                    { $match: { status: "delivered" } },
                    { $unwind: "$items" },
                    {
                        $group: {
                            _id: "$items.name",
                            quantity: { $sum: "$items.quantity" },
                            revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
                        },
                    },
                    { $sort: { quantity: -1 } },
                    { $limit: 5 },
                ],
                daily: [
                    { $match: { status: "delivered" } },
                    {
                        $group: {
                            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                            orders: { $sum: 1 },
                            gross: { $sum: "$subTotal" },
                        },
                    },
                    { $sort: { _id: 1 } },
                ],
            },
        },
    ]);

    const { earned, pending } = summarise(result?.buckets ?? []);

    return res.status(200).json({
        success: true,
        range: (req.query.range as string) ?? "all",
        commissionRate: PLATFORM_COMMISSION_RATE,
        earned,
        pending,
        averageOrderValue: earned.orders ? round2(earned.gross / earned.orders) : 0,
        topItems: (result?.topItems ?? []).map((i: { _id: string; quantity: number; revenue: number }) => ({
            name: i._id,
            quantity: i.quantity,
            revenue: round2(i.revenue),
        })),
        daily: (result?.daily ?? []).map((d: { _id: string; orders: number; gross: number }) => ({
            date: d._id,
            orders: d.orders,
            gross: round2(d.gross),
            net: round2(d.gross * (1 - PLATFORM_COMMISSION_RATE)),
        })),
    });
});

// Internal: the rider service owns rider identity, so it resolves the riderId
// and asks us for the orders, which live here.
export const getRiderCompletedOrders = TryCatch(async (req: Request, res: Response) => {
    if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
        return res.status(403).json({
            success: false,
            message: "Forbidden",
        });
    }

    const { riderId } = req.query;

    if (!riderId) {
        return res.status(400).json({
            success: false,
            message: "RiderId is required",
        });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));

    const filter = { riderId, status: "delivered" };

    const [orders, total] = await Promise.all([
        Order.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit),
        Order.countDocuments(filter),
    ]);

    return res.status(200).json({
        success: true,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        orders,
    });
});

// Internal: rider pay is riderAmount, already fixed per order at creation time.
export const getRiderEarnings = TryCatch(async (req: Request, res: Response) => {
    if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
        return res.status(403).json({
            success: false,
            message: "Forbidden",
        });
    }

    const { riderId } = req.query;

    if (!riderId) {
        return res.status(400).json({
            success: false,
            message: "RiderId is required",
        });
    }

    const since = rangeStart(req.query.range);

    const match: Record<string, unknown> = { riderId, status: "delivered" };
    if (since) match.updatedAt = { $gte: since };

    const [result] = await Order.aggregate([
        { $match: match },
        {
            $facet: {
                totals: [
                    {
                        $group: {
                            _id: null,
                            deliveries: { $sum: 1 },
                            earnings: { $sum: "$riderAmount" },
                            distance: { $sum: "$distance" },
                        },
                    },
                ],
                daily: [
                    {
                        $group: {
                            _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } },
                            deliveries: { $sum: 1 },
                            earnings: { $sum: "$riderAmount" },
                            distance: { $sum: "$distance" },
                        },
                    },
                    { $sort: { _id: 1 } },
                ],
            },
        },
    ]);

    const totals = result?.totals?.[0] ?? { deliveries: 0, earnings: 0, distance: 0 };

    return res.status(200).json({
        success: true,
        range: (req.query.range as string) ?? "all",
        deliveries: totals.deliveries,
        earnings: round2(totals.earnings),
        distance: round2(totals.distance),
        averagePerDelivery: totals.deliveries ? round2(totals.earnings / totals.deliveries) : 0,
        daily: (result?.daily ?? []).map((d: { _id: string; deliveries: number; earnings: number; distance: number }) => ({
            date: d._id,
            deliveries: d.deliveries,
            earnings: round2(d.earnings),
            distance: round2(d.distance),
        })),
    });
});
