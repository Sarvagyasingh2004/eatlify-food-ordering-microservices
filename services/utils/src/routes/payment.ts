import { Router } from "express";
import { isAuth } from "../middlewares/isAuth.js";
import { createRazorpayOrder, payWithStripe, verifRazorpayPayment, verifyStripe } from "../controllers/payment.js";

const router = Router();

// All of these act on a specific orderId, so they must be tied to a logged-in
// user - unauthenticated, anyone could open payment sessions for other people's
// orders.
router.post("/create", isAuth, createRazorpayOrder);
router.post("/verify", isAuth, verifRazorpayPayment);
router.post("/stripe/create", isAuth, payWithStripe);
router.post("/stripe/verify", isAuth, verifyStripe);

export default router;
