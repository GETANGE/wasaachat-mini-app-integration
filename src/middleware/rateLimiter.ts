import { rateLimit } from "express-rate-limit";
import type { Options } from "express-rate-limit";

const MINUTE = 60 * 1000;

export function createRateLimiter(options: Partial<Options> = {}) {
  return rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 15 * MINUTE),
    limit: Number(process.env.RATE_LIMIT_MAX ?? 100),
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
    ...options,
  });
}

export const apiRateLimiter = createRateLimiter();

export const wasaaSessionRateLimiter = createRateLimiter({
  windowMs: MINUTE,
  limit: Number(process.env.WASAA_SESSION_RATE_LIMIT_MAX ?? 30),
});
