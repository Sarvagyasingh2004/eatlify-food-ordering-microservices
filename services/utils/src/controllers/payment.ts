import dotenv from "dotenv";
import Stripe from "stripe";
import { Request, Response } from "express";
import axios from "axios";
import { razorpay } from "../config/razorpay.js";
import { verifyRazorpaySignature } from "../config/verifyRazorpay.js";
import { publishPaymentSuccess } from "../config/payment.producer.js";
export const createRazorpayOrder = async (req: Request, res: Response) => {
    const { orderId } = req.body;
    const { data } = await axios.get(`${process.env.RESTAURANT_SERVICE}/api/order/payment/${orderId}`, {
        headers: {
            "x-internal-key": process.env.INTERNAL_SERVICE_KEY!,
        }
    });

    const razorpayOrder = await razorpay.orders.create({
        amount: data.amount * 100,
        currency: "INR",
        receipt: orderId,
    });

    return res.status(201).json({
        razorpayOrderId: razorpayOrder.id,
        key: process.env.RAZORPAY_KEY_ID,
    });
};

export const verifRazorpayPayment = async (req: Request, res: Response) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    const isValid = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    if (!isValid) {
        return res.status(400).json({
            success: false,
            message: "Payment verification failed",
        });
    }

    await publishPaymentSuccess({ orderId, paymentId: razorpay_payment_id, provider: "razorpay" });

    return res.status(200).json({
        success: true,
        message: "Payment verified succesfully",
    });
};


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const payWithStripe = async (req: Request, res: Response) => {
    try {
        const { orderId } = req.body;
        const { data } = await axios.get(`${process.env.RESTAURANT_SERVICE}/api/order/payment/${orderId}`, {
            headers: {
                "x-internal-key": process.env.INTERNAL_SERVICE_KEY!,
            }
        });

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            line_items: [{
                price_data: {
                    currency: "inr",
                    product_data: {
                        name: "Eatlify"
                    },
                    unit_amount: data.amount * 100,
                },
                quantity: 1,
            }],
            metadata: {
                orderId,
            },
            success_url: `${process.env.FRONTEND_URL}/ordersuccess?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/checkout`,
        });

        return res.json({
            success: true,
            url: session.url,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Stripe payment failed",
        });
    }
}

export const verifyStripe = async (req: Request, res: Response) => {
    const { sessionId } = req.body;
    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (!session) {
            return res.status(400).json({
                success: false,
                message: "Stripe payment verification failed",
            });
        }

        const orderId = session.metadata?.orderId;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: "No orderId found in stripe session",
            });
        }

        await publishPaymentSuccess({
            orderId,
            paymentId: sessionId,
            provider: "stripe",
        });

        return res.json({
            success: true,
            message: "Payment verified successfully",
        });


    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Stripe payment verification failed",
        });
    }
}