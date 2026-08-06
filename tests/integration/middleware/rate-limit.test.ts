import { createRateLimiter } from "$/middleware/rate-limit";
import { redisClient } from "$/utils/redis";
import * as Sentry from "@sentry/bun";
import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import express from "express";
import { RedisStore } from "rate-limit-redis";
import request from "supertest";

function buildTestApp(
  limit: number,
  overrides: Parameters<typeof createRateLimiter>[1] = {},
) {
  const prefix = `test-${Bun.randomUUIDv7()}`;
  const testApp = express();
  testApp.use(
    createRateLimiter(prefix, {
      windowMs: 60_000,
      limit,
      store: new RedisStore({
        prefix: `rate-limit:${prefix}:`,
        sendCommand: (command: string, ...rest: string[]) =>
          redisClient.send(command, rest),
      }),
      ...overrides,
    }),
  );
  testApp.get("/", (req, res) => res.sendStatus(200));
  return { testApp, prefix };
}

afterEach(() => {
  mock.restore();
});

describe("rateLimiter", () => {
  it("allows requests under the limit", async () => {
    const { testApp } = buildTestApp(2, { skip: () => false });

    await request(testApp).get("/").expect(200);
    await request(testApp).get("/").expect(200);
  });

  it("blocks requests once the limit is exceeded, with a JSON error body", async () => {
    const { testApp } = buildTestApp(2, { skip: () => false });

    await request(testApp).get("/").expect(200);
    await request(testApp).get("/").expect(200);
    const response = await request(testApp).get("/").expect(429);

    expect(response.body).toEqual({
      error: "Too many requests, please try again later.",
    });
  });

  it("is skipped by default under NODE_ENV=test so it doesn't interfere with other suites", async () => {
    const { testApp } = buildTestApp(1);

    await request(testApp).get("/").expect(200);
    await request(testApp).get("/").expect(200);
  });

  it("reports a Sentry metric with the prefix and rate limit key when a client is rate-limited", async () => {
    const countSpy = spyOn(Sentry.metrics, "count");
    const { testApp, prefix } = buildTestApp(1, { skip: () => false });

    await request(testApp).get("/").expect(200);
    await request(testApp).get("/").expect(429);

    expect(countSpy).toHaveBeenCalledTimes(1);
    const [name, value, options] = countSpy.mock.calls[0]!;
    expect(name).toBe("rate-limi-hit");
    expect(value).toBe(1);
    expect(options?.attributes?.prefix).toBe(prefix);
    expect(typeof options?.attributes?.key).toBe("string");
  });

  it("does not report a Sentry metric for requests under the limit", async () => {
    const countSpy = spyOn(Sentry.metrics, "count");
    const { testApp } = buildTestApp(2, { skip: () => false });

    await request(testApp).get("/").expect(200);

    expect(countSpy).not.toHaveBeenCalled();
  });
});
