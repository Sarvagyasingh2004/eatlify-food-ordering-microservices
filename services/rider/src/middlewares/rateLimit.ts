import type { Request, Response, NextFunction } from "express";
import { rateLimit } from "../config/redis.js";

interface MaybeAuthenticated extends Request {
    user?: { _id: string } | null;
}

interface Options {
    /** Namespaces the Redis key, so limits on different routes never collide. */
    name: string;
    limit: number;
    windowSeconds: number;
    /** Authenticated routes key on the user; public ones fall back to IP. */
    by?: "user" | "ip";
}

/**
 * Fixed-window limiter backed by Redis. Fails open - see config/redis.ts - so a
 * Redis outage lets traffic through rather than rejecting everything.
 *
 * IP keying only works if Express trusts the proxy, otherwise every request
 * behind nginx shares one address and the limit becomes global. Each service
 * sets `trust proxy` in index.ts for that reason.
 */
export const rateLimiter =
    ({ name, limit, windowSeconds, by = "user" }: Options) =>
    async (req: MaybeAuthenticated, res: Response, next: NextFunction): Promise<void> => {
        const subject =
            by === "ip"
                ? req.ip ?? "unknown"
                : req.user?._id?.toString() ?? req.ip ?? "unknown";

        const { allowed, remaining, retryAfter } = await rateLimit(
            `ratelimit:${name}:${subject}`,
            limit,
            windowSeconds,
        );

        if (!allowed) {
            res.setHeader("Retry-After", String(retryAfter));
            res.status(429).json({
                success: false,
                message: "Too many requests. Please wait a moment and try again.",
            });
            return;
        }

        res.setHeader("X-RateLimit-Limit", String(limit));
        res.setHeader("X-RateLimit-Remaining", String(remaining));
        next();
    };
