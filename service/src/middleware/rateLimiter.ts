import rateLimit from "express-rate-limit";

/** Global API rate limiter — 100 requests per minute per IP */
export const globalLimiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests, try again later" },
});

/** Strict limiter for trade/write endpoints — 30 requests per minute per IP */
export const tradeLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many trade requests, slow down" },
});

/** Launch limiter — 5 per minute per IP (prevent spam launches) */
export const launchLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many launches, try again later" },
});
