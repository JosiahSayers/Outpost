import { db } from "$/utils/db";
import {
  __setActiveTestTransaction,
  __clearActiveTestTransaction,
} from "$/utils/test-db";
import { RedisClient } from "bun";
import { afterEach, beforeAll, beforeEach } from "bun:test";
import type { Prisma } from "$/../generated/prisma/client";

// Loaded in addition to tests/preload.ts (via --preload) only for
// `bun run test:integration`. Runs each test inside a Postgres transaction
// that's always rolled back afterward — nothing a test writes is ever
// committed, so there's no state to reset between tests. Unit and component
// tests never load this file, so they skip it entirely.

const redis = new RedisClient();

beforeAll(async () => {
  await Bun.$`bunx --bun prisma migrate reset --force`;
  await Bun.$`bun db:seed`;
}, 60_000);

class RollbackSentinel extends Error {}

let releaseTransaction: (() => void) | undefined;
let settledTransaction: Promise<void> | undefined;

beforeEach(async () => {
  await new Promise<void>((resolveReady) => {
    const heldOpen = new Promise<void>((resolve) => {
      releaseTransaction = resolve;
    });

    settledTransaction = db
      .$transaction(
        async (tx: Prisma.TransactionClient) => {
          __setActiveTestTransaction(tx);
          resolveReady();
          await heldOpen;
          throw new RollbackSentinel();
        },
        // The transaction now spans a whole test's worth of work (multiple
        // supertest round-trips, job invocations, etc.), not a few queries,
        // so the 5s/2s defaults are far too tight.
        { timeout: 30_000, maxWait: 5_000 },
      )
      .catch((err: unknown) => {
        if (!(err instanceof RollbackSentinel)) throw err;
      });
  });
});

afterEach(async () => {
  releaseTransaction?.();
  await settledTransaction;
  __clearActiveTestTransaction();
});

afterEach(async () => {
  await redis.send("FLUSHDB", []);
});
