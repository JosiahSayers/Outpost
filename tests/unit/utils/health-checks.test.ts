import { describe, it, expect, mock, afterEach } from "bun:test";

describe("run", () => {
  afterEach(() => {
    mock.restore();
  });

  it("returns the expected result when successful", async () => {
    const { HealthChecks } = await import("$/utils/health-checks");
    expect(await HealthChecks.run()).toMatchInlineSnapshot(`
      {
        "database": "connected",
        "redis": "PONG",
        "sha": undefined,
        "version": undefined,
      }
    `);
  });

  // mock.module does not do any hoising so it needs called before dependencies are imported
  // https://github.com/oven-sh/bun/issues/10428
  // Mocking is all kinds of fucked up in bun right now. On top of the above issue this never gets
  // restored and polutes other tests
  // https://github.com/oven-sh/bun/issues/7823
  it.skip("returns the expected result when there is a failure", async () => {
    mock.module("$/utils/db", async () => {
      const actualDb = require("$/utils/db");
      return {
        db: {
          ...actualDb.db,
          $queryRaw: () => {
            throw new Error();
          },
        },
      };
    });

    const { HealthChecks } = await import("$/utils/health-checks");

    expect(await HealthChecks.run()).toMatchInlineSnapshot(`
      {
        "database": "fail",
        "failures": [
          "database",
        ],
        "redis": "PONG",
        "sha": undefined,
        "version": undefined,
      }
    `);
  });
});
