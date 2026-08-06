import { redisClient } from "$/utils/redis";
import { rateLimit, type Options } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";

export function createRateLimiter(
  overrides: Partial<Options & { prefix: string }> = {},
) {
  return rateLimit({
    windowMs: 60_000,
    limit: 300,
    standardHeaders: false,
    legacyHeaders: false,
    skipFailedRequests: true,
    skip: () => Bun.env.NODE_ENV === "test",
    handler: (req, res) => {
      res
        .status(429)
        .json({ error: "Too many requests, please try again later." });
    },
    store: new RedisStore({
      prefix: `rate-limit:${overrides.prefix ? overrides.prefix + ":" : ""}`,
      sendCommand: (command: string, ...rest: string[]) =>
        redisClient.send(command, rest),
    }),
    ...overrides,
  });
}

export const ipRateLimiter = createRateLimiter({ skipFailedRequests: false });

export const feedbackRateLimiter = createRateLimiter({
  windowMs: 60_000,
  limit: 2,
  keyGenerator: (req) => req.session!.user.id,
  prefix: "feedback",
});

export const pdfRateLimiter = createRateLimiter({
  windowMs: 60_000,
  limit: 10,
  keyGenerator: (req) => req.session!.user.id,
  prefix: "pdf",
});
