import { db } from "$/utils/db";
import { RedisClient } from "bun";

export class HealthChecks {
  private static CHECKS = [
    {
      name: "database",
      runner: async () => {
        await db.$queryRaw`SELECT 1`;
        return "connected";
      },
    },
    {
      name: "redis",
      runner: async () => {
        const client = new RedisClient(undefined, { maxRetries: 0 });
        return client.ping();
      },
    },
    {
      name: "version",
      runner: () => Bun.env.VERSION,
    },
    {
      name: "sha",
      runner: () => Bun.env.COMMIT_SHA,
    },
  ] as const;

  static async run() {
    const output: Record<string, any> = {
      failures: [],
    };

    for await (const check of this.CHECKS) {
      let checkResult;
      try {
        checkResult = await check.runner();
      } catch (e) {
        checkResult = "fail";
        output.failures.push(check.name);
      } finally {
        output[check.name] = checkResult;
      }
    }

    if (output.failures.length === 0) {
      delete output.failures;
    }

    return output;
  }
}
