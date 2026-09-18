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
            return;
        }
        const token = authHeader.split(" ")[1] as string;
        if (!token) {
            res.status(401).json({
                success: false,
                message: "Invalid login. Please login again",
            });
            return;
        }
        const decodedValue = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
        if (!decodedValue || !decodedValue.user) {
            res.status(401).json({
                success: false,
                message: "Invalid token",
            });
            return;
        }
        req.user = decodedValue.user;
        next();
    } catch (error) {
        // an expired or tampered token is the caller's problem, not a server fault
        res.status(401).json({
            success: false,
            message: "Invalid login. Please login again",
        });
    }
}

export const isAdmin = TryCatch(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Please login",
            });
            return;
        }

        if (req.user.role !== "admin") {
            res.status(403).json({
                success: false,
                message: "Access denied",
            });
            return;
        }
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: "Please login",
        });
    }
});