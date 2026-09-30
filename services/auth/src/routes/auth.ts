import express from "express";
import { loginUser } from "../controllers/auth.js";
import { adduserRole, isAuth, myProfile } from "../middlewares/isAuth.js";
import { rateLimiter } from "../middlewares/rateLimit.js";

const router = express.Router();

router.post("/login", rateLimiter({ name: "login", limit: 20, windowSeconds: 60, by: "ip" }), loginUser);
router.put("/add/role", isAuth, adduserRole);
router.get("/me", isAuth, myProfile);

export default router;