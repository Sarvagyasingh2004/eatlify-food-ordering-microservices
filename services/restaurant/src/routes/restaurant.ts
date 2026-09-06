import express from "express";
import { isAuth, isSeller } from "../middlewares/isAuth.js";
import { addRestaurant, fetchMyRestaurant, fetchSingleRestaurant, getNearbyRestaurants, updateRestaurant, updateRestaurantStatus } from "../controllers/restaurant.js";
import uploadFile from "../middlewares/multer.js";

const router = express.Router();

router.post("/add", isAuth, isSeller, uploadFile, addRestaurant);
router.get("/my", isAuth, isSeller, fetchMyRestaurant);
router.put("/status", isAuth, isSeller, updateRestaurantStatus);
router.put("/edit", isAuth, isSeller, updateRestaurant);
router.get("/all", isAuth, getNearbyRestaurants);
router.get("/:id", isAuth, fetchSingleRestaurant);

export default router;