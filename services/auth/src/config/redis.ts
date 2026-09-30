import { createClient } from "redis";

type Client = ReturnType<typeof createClient>;

let client: Client | null = null;
let ready = false;

/**
 * Redis is an optimisation here, never a dependency. Caching and rate limiting
 * both degrade to "do the real work" if it is unreachable, so a cache outage
 * must not take ordering down with it.
 */
export const connectRedis = async () => {
    const url = process.env.REDIS_URL;

    if (!url) {
        console.warn("REDIS_URL not set - caching and rate limiting are disabled");
        return;
    }

    client = createClient({
        url,
        socket: {
            // Cap the backoff so a long outage does not turn into a retry storm,
            // and never give up - the process should recover on its own.
            reconnectStrategy: (retries) => Math.min(1000 * 2 ** retries, 30000),
        },
    });

    // node-redis reconnects on its own; an unhandled "error" would take the
    // process down, so it is bound and only logged.
    client.on("error", (error: Error) => {
        if (ready) console.error("Redis error:", error.message);
        ready = false;
    });
    client.on("ready", () => {
        ready = true;
        console.log("Connected to Redis");
    });
    client.on("end", () => {
        ready = false;
    });

    try {
        await client.connect();
    } catch (error) {
        console.error(
            "Redis unavailable at startup, continuing without it:",
            error instanceof Error ? error.message : error,
        );
    }
};

const usable = () => client !== null && ready;

export const cacheGet = async <T>(key: string): Promise<T | null> => {
    if (!usable()) return null;

    try {
        const raw = await client!.get(key);
        return raw ? (JSON.parse(raw) as T) : null;
    } catch (error) {
        console.error(`Redis GET ${key} failed:`, error);
        return null;
    }
};

export const cacheSet = async (key: string, value: unknown, ttlSeconds: number) => {
    if (!usable()) return;

    try {
        await client!.set(key, JSON.stringify(value), {
            expiration: { type: "EX", value: ttlSeconds },
        });
    } catch (error) {
        console.error(`Redis SET ${key} failed:`, error);
    }
};

export const cacheDel = async (...keys: string[]) => {
    if (!usable() || keys.length === 0) return;

    try {
        await client!.del(keys);
    } catch (error) {
        console.error(`Redis DEL ${keys.join(",")} failed:`, error);
    }
};

/**
 * Fixed-window counter. INCR and EXPIRE go in one transaction, and EXPIRE uses
 * NX so only the first request of a window sets the TTL - later ones cannot
 * extend it, and a crash between the two cannot leave a key without expiry.
 *
 * Fails OPEN: if Redis is unreachable the request is allowed. Rejecting all
 * traffic because the rate limiter is down is worse than not rate limiting.
 */
export const rateLimit = async (
    key: string,
    limit: number,
    windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number; retryAfter: number }> => {
    if (!usable()) return { allowed: true, remaining: limit, retryAfter: 0 };

    try {
        const results = await client!
            .multi()
            .incr(key)
            .expire(key, windowSeconds, "NX")
            .exec();

        const count = Number(results[0]);

        if (!Number.isFinite(count)) {
            return { allowed: true, remaining: limit, retryAfter: 0 };
        }

        const ttl = count > limit ? await client!.ttl(key) : 0;

        return {
            allowed: count <= limit,
            remaining: Math.max(0, limit - count),
            retryAfter: ttl > 0 ? ttl : windowSeconds,
        };
    } catch (error) {
        console.error(`Redis rate limit ${key} failed, allowing request:`, error);
        return { allowed: true, remaining: limit, retryAfter: 0 };
    }
};
