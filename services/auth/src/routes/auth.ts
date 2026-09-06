import express from "express";
import { loginUser } from "../controllers/auth.js";
import { adduserRole, isAuth, myProfile } from "../middlewares/isAuth.js";

const router = express.Router();

router.post("/login", loginUser);
router.put("/add/role", isAuth, adduserRole);
router.get("/me", isAuth, myProfile);

export default router;