import { redisClient } from "$/utils/redis";
import * as Sentry from "@sentry/bun";
import {
  rateLimit,
  type AugmentedRequest,
  type Options,
} from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";

export function createRateLimiter(
  prefix: string,
  overrides: Partial<Options> = {},
) {
  return rateLimit({
    windowMs: 60_000,
    limit: 300,
    standardHeaders: false,
    legacyHeaders: false,
    skipFailedRequests: true,
    skip: () => Bun.env.NODE_ENV !== "production",
    handler: (req, res) => {
      Sentry.metrics.count("rate-limi-hit", 1, {
        attributes: {
          prefix,
          key: (req as AugmentedRequest).rateLimit!.key,
        },
      });
      res
        .status(429)
        .json({ error: "Too many requests, please try again later." });
    },
    store: new RedisStore({
      prefix: `rate-limit:${prefix}:`,
      sendCommand: (command: string, ...rest: string[]) =>
        redisClient.send(command, rest),
    }),
    ...overrides,
  });
}

export const ipRateLimiter = createRateLimiter("global-ip", {
  skipFailedRequests: false,
});

export const feedbackRateLimiter = createRateLimiter("feedback", {
  windowMs: 60_000,
  limit: 2,
  keyGenerator: (req) => req.session!.user.id,
});

export const pdfRateLimiter = createRateLimiter("pdf", {
  windowMs: 60_000,
  limit: 10,
  keyGenerator: (req) => req.session!.user.id,
});
