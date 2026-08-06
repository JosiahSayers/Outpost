import { redisClient } from "$/utils/redis";
import { rateLimit, type Options } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";

export function createRateLimiter(overrides: Partial<Options> = {}) {
  return rateLimit({
    windowMs: 60_000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => Bun.env.NODE_ENV === "test",
    handler: (req, res) => {
      res
        .status(429)
        .json({ error: "Too many requests, please try again later." });
    },
    store: new RedisStore({
      prefix: "rate-limit:",
      sendCommand: (command: string, ...rest: string[]) =>
        redisClient.send(command, rest),
    }),
    ...overrides,
  });
}

export const ipRateLimiter = createRateLimiter();
export const authRateLimiter = createRateLimiter();
