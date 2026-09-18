import express from "express";
import { isAdmin, isAuth } from "../middlewares/isAuth.js";
import { getPendingRestaurants, getPendingRiders, verifyRestaurant, verifyRider } from "../controllers/admin.js";

const router = express.Router();

router.get("/restaurant/pending", isAuth, isAdmin, getPendingRestaurants);
router.get("/rider/pending", isAuth, isAdmin, getPendingRiders);
router.patch("/verify/restaurant/:id", isAuth, isAdmin, verifyRestaurant);
router.patch("/verify/rider/:id", isAuth, isAdmin, verifyRider);

export default router;