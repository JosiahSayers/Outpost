import { createRateLimiter } from "$/middleware/rate-limit";
import { redisClient } from "$/utils/redis";
import { describe, expect, it } from "bun:test";
import express from "express";
import { RedisStore } from "rate-limit-redis";
import request from "supertest";

function buildTestApp(
  limit: number,
  overrides: Parameters<typeof createRateLimiter>[0] = {},
) {
  const testApp = express();
  testApp.use(
    createRateLimiter({
      windowMs: 60_000,
      limit,
      store: new RedisStore({
        prefix: `test-rate-limit:${Bun.randomUUIDv7()}:`,
        sendCommand: (command: string, ...rest: string[]) =>
          redisClient.send(command, rest),
      }),
      ...overrides,
    }),
  );
  testApp.get("/", (req, res) => res.sendStatus(200));
  return testApp;
}

describe("rateLimiter", () => {
  it("allows requests under the limit", async () => {
    const testApp = buildTestApp(2, { skip: () => false });

    await request(testApp).get("/").expect(200);
    await request(testApp).get("/").expect(200);
  });

  it("blocks requests once the limit is exceeded, with a JSON error body", async () => {
    const testApp = buildTestApp(2, { skip: () => false });

    await request(testApp).get("/").expect(200);
    await request(testApp).get("/").expect(200);
    const response = await request(testApp).get("/").expect(429);

    expect(response.body).toEqual({
      error: "Too many requests, please try again later.",
    });
  });

  it("is skipped by default under NODE_ENV=test so it doesn't interfere with other suites", async () => {
    const testApp = buildTestApp(1);

    await request(testApp).get("/").expect(200);
    await request(testApp).get("/").expect(200);
  });
});
