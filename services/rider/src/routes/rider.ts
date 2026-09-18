import { Router } from "express";
import { isAuth } from "../middlewares/isAuth.js";
import {
    acceptOrder,
    addRiderProfile,
    fetchMyCompletedOrders,
    fetchMyCurrentOrder,
    fetchMyEarnings,
    fetchMyprofile,
    toggleRiderAvailability,
    updateOrderStatus,
    updateRiderLocation,
} from "../controllers/rider.js";
import uploadFile from "../middlewares/multer.js";

const router = Router();

// --- profile & availability ---
router.get("/my", isAuth, fetchMyprofile);
router.post("/add", isAuth, uploadFile, addRiderProfile);
router.patch("/toggle", isAuth, toggleRiderAvailability);

// --- active delivery ---
router.post("/accept/:orderId", isAuth, acceptOrder);
router.get("/order/current", isAuth, fetchMyCurrentOrder);
router.patch("/order/update/:orderId", isAuth, updateOrderStatus);
router.post("/location", isAuth, updateRiderLocation);

// --- history & earnings ---
router.get("/orders/completed", isAuth, fetchMyCompletedOrders);
router.get("/earnings", isAuth, fetchMyEarnings);

export default router;
