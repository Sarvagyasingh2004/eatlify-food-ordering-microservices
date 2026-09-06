import { Request, Response, NextFunction } from "express";

import jwt, { JwtPayload } from "jsonwebtoken";
import User, { IUser } from "../models/User.js";
import TryCatch from "./trycatch.js";

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

const allowedRoles = ["customer", "rider", "seller"] as const;
type Role = (typeof allowedRoles)[number];

export const adduserRole = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user?._id) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized access"
        });
    }
    const { role } = req.body as { role: Role };

    if (!allowedRoles.includes(role)) {
        return res.status(403).json({
            success: false,
            message: "Access forbidden"
        });
    }

    const user = await User.findByIdAndUpdate(req.user._id, { role }, { new: true });

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found.",
        });
    }

    const token = jwt.sign({ user }, process.env.JWT_SECRET as string, {
        expiresIn: "15d",
    });

    return res.status(200).json({
        success: true,
        message: "User updated successfully.",
        user,
        token
    })

});

export const myProfile = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    return res.json(user);
});