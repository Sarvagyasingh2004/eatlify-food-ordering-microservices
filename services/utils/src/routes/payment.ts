import { Router } from "express";
import { isAuth } from "../middlewares/isAuth.js";
import { createRazorpayOrder, payWithStripe, verifRazorpayPayment, verifyStripe } from "../controllers/payment.js";
import { rateLimiter } from "../middlewares/rateLimit.js";

const router = Router();

// All of these act on a specific orderId, so they must be tied to a logged-in
// user - unauthenticated, anyone could open payment sessions for other people's
// orders.
const paymentLimit = rateLimiter({ name: "payment", limit: 10, windowSeconds: 60 });

router.post("/create", isAuth, paymentLimit, createRazorpayOrder);
router.post("/verify", isAuth, paymentLimit, verifRazorpayPayment);
router.post("/stripe/create", isAuth, paymentLimit, payWithStripe);
router.post("/stripe/verify", isAuth, paymentLimit, verifyStripe);

export default router;
