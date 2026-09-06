import express from "express";
import { isAuth, isSeller } from "../middlewares/isAuth.js";
import { addMenuItem, deleteMenuItems, getAll, toggleMenuItemAvailability } from "../controllers/menuItems.js";
import uploadFile from "../middlewares/multer.js";


const router = express.Router();

router.post("/add", isAuth, isSeller, uploadFile, addMenuItem);
router.get("/all/:id", isAuth, getAll);
router.delete("/:itemId", isAuth, isSeller, deleteMenuItems);
router.put("/status/:itemId", isAuth, isSeller, toggleMenuItemAvailability);

export default router;