import { Request, Response, NextFunction } from "express";

import jwt, { JwtPayload } from "jsonwebtoken";
import TryCatch from "./trycatch.js";

export interface IUser {
    _id: string;
    name: string;
    email: String;
    image: string;
    role: string;
    restaurantId: string;
}

export interface AuthenticatedRequest extends Request {
    user?: IUser | null,
}

export const isAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({
                success: false,
                message: "Invalid login. Please login again",
            });
        }
        const token = authHeader?.split(" ")[1] as string;
        if (!token) {
            res.status(401).json({
                success: false,
                message: "Invalid login. Please login again",
            });
        }
        const decodedValue = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
        if (!decodedValue || !decodedValue.user) {
            res.status(401).json({
                success: false,
                message: "Invalid token",
            });
        }
        req.user = decodedValue.user;
        next();
    } catch (error) {
        res.status(500).send({
            success: false,
            message: "Internal server error."
        });
    }
}


export const isSeller = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user;

    if (user && user.role !== "seller") {
        res.status(401).json({
            success: false,
            message: "You are not an authorized seller"
        });
        return;
    }

    next();
}