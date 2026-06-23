import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import redisClient from "../config/redis.js";

// Login rate limiter: Max 5 failed logins per day (24 hours) per IP
export const loginRateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  limit: 5, // Limit to 5 failed attempts
  skipSuccessfulRequests: true, // Only count requests that return non-2xx status codes
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
    prefix: "rl:login:",
  }),
  message: {
    message: "Too many failed login attempts. Please try again after 24 hours.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Transaction rate limiter: Max 2 transactions per minute per user (or IP if not authenticated)
export const transactionRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 2, // Limit to 2 transactions
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
    prefix: "rl:tx:",
  }),
  keyGenerator: (req, res) => {
    // Fallback to IP if req.user is not set
    return req.user ? String(req.user.id) : ipKeyGenerator(req, res);
  },
  message: {
    message: "Too many transactions. Only 2 transactions per minute are allowed.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
