import express from "express";
import { isAuth } from "../middlewares/isAuth.js";
import { addAddress, deleteAddress, getAllAddresses } from "../controllers/address.js";


const router = express.Router();

router.post("/add", isAuth, addAddress);
router.get("/all", isAuth, getAllAddresses);
router.delete("/:id", isAuth, deleteAddress);

export default router;