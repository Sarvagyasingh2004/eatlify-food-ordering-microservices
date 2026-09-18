import { Router } from "express";
import { isAuth, isSeller } from "../middlewares/isAuth.js";
import {
    assignRiderToOrder,
    createOrder,
    fetchOrderForPayment,
    fetchRestaurantOrders,
    fetchSingleOrder,
    getCurrentOrderForRider,
    getMyOrders,
    getRestaurantStats,
    getRiderCompletedOrders,
    getRiderEarnings,
    updateOrderStatus,
    updateOrderStatusRider,
} from "../controllers/order.js";

const router = Router();

// --- customer ---
router.get("/myorder", isAuth, getMyOrders);
router.post("/add", isAuth, createOrder);

// --- seller ---
router.get("/restaurant/:restaurantId", isAuth, isSeller, fetchRestaurantOrders);
router.get("/restaurant/:restaurantId/stats", isAuth, isSeller, getRestaurantStats);
router.put("/:orderId", isAuth, isSeller, updateOrderStatus);

// --- service-to-service (guarded by x-internal-key in each handler) ---
router.get("/payment/:id", fetchOrderForPayment);
router.put("/assign/rider", assignRiderToOrder);
router.get("/current/rider", getCurrentOrderForRider);
router.put("/update/status/rider", updateOrderStatusRider);
router.get("/rider/completed", getRiderCompletedOrders);
router.get("/rider/earnings", getRiderEarnings);

// keep last: a bare /:id would otherwise swallow the single-segment routes above
router.get("/:id", isAuth, fetchSingleOrder);

export default router;
