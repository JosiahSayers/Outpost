import type { Prisma, PrismaClient } from "$/../generated/prisma/client";

// Only wired up as `db` (via app/utils/db.ts) when NODE_ENV=test. Redirects
// every call to the active test transaction so tests/integration-preload.ts
// can run each test inside one transaction that's rolled back afterward,
// instead of resetting the database between tests. With no active test
// transaction (e.g. during `test:unit`, which never loads that preload
// file), this is a pure passthrough to the real client.
let activeTestTransaction: Prisma.TransactionClient | null = null;

export function __setActiveTestTransaction(tx: Prisma.TransactionClient) {
  if (Bun.env.NODE_ENV === "production") {
    throw new Error(
      "__setActiveTestTransaction must never be used in production",
    );
  }
  if (activeTestTransaction) {
    throw new Error(
      "A test transaction is already active — tests must run one at a time",
    );
  }
  activeTestTransaction = tx;
}

export function __clearActiveTestTransaction() {
  activeTestTransaction = null;
  savepointQueue = Promise.resolve();
}

// Postgres aborts an entire transaction block after any query error, until a
// ROLLBACK (or ROLLBACK TO SAVEPOINT). Since a whole test now runs inside one
// transaction, a call that deliberately triggers a DB error (e.g. a test
// asserting a FK violation is rejected) would otherwise poison every query
// for the rest of that test. Wrap each individual operation in its own
// savepoint so a failure only undoes that one call.
//
// Savepoints on a connection nest in strict LIFO order — releasing an older
// one implicitly destroys any newer ones still open. App code routinely
// fires concurrent queries (e.g. `Promise.all([db.x.findMany(), db.x.count()])`),
// which would otherwise open interleaved savepoints out of order. Since a
// test's whole transaction already lives on one connection (no real
// parallelism is possible there anyway), queue every savepoint-wrapped
// operation so they run one at a time in submission order.
let savepointCounter = 0;
let savepointQueue: Promise<unknown> = Promise.resolve();

function withSavepoint<T>(
  tx: Prisma.TransactionClient,
  run: () => Promise<T>,
): Promise<T> {
  const result = savepointQueue.then(async () => {
    const savepoint = `sp_${savepointCounter++}`;
    await tx.$executeRawUnsafe(`SAVEPOINT "${savepoint}"`);
    try {
      const value = await run();
      await tx.$executeRawUnsafe(`RELEASE SAVEPOINT "${savepoint}"`);
      return value;
    } catch (err) {
      await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT "${savepoint}"`);
      throw err;
    }
  });
  // Keep the queue moving even if this operation failed — a rejection here
  // must not block the next queued operation from starting.
  savepointQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function wrapModelDelegate(delegate: object, tx: Prisma.TransactionClient) {
  return new Proxy(delegate, {
    get(target, prop) {
      const value = (target as never)[prop as never];
      if (typeof value !== "function") return value;
      return (...args: unknown[]) =>
        withSavepoint(tx, () =>
          (value as (...a: unknown[]) => Promise<unknown>).apply(target, args),
        );
    },
  });
}

const RAW_QUERY_METHODS = new Set([
  "$queryRaw",
  "$queryRawUnsafe",
  "$executeRaw",
  "$executeRawUnsafe",
]);

export function createTestDb(realDb: PrismaClient): PrismaClient {
  return new Proxy(realDb, {
    get(target, prop) {
      const tx = activeTestTransaction;
      const source = tx ?? target;

      // Array-form `$transaction([...])` opens its own transaction on a fresh
      // connection when called on an interactive-transaction client, unaware
      // of the active test transaction's uncommitted writes. Its array elements
      // are already-scoped PrismaPromises (built off `source` via this same
      // Proxy), so Promise.all-ing them directly gets the same result without
      // a separate transaction.
      if (prop === "$transaction" && tx) {
        return (arg: unknown, opts?: unknown) =>
          Array.isArray(arg)
            ? Promise.all(arg)
            : (source.$transaction as (...a: unknown[]) => unknown)(arg, opts);
      }

      const value = (source as never)[prop as never];
      if (!tx) return value;

      if (typeof prop === "string" && RAW_QUERY_METHODS.has(prop)) {
        return (...args: unknown[]) =>
          withSavepoint(tx, () =>
            (value as (...a: unknown[]) => Promise<unknown>).apply(
              source,
              args,
            ),
          );
      }
      if (
        typeof value === "object" &&
        value !== null &&
        !prop.toString().startsWith("$")
      ) {
        return wrapModelDelegate(value, tx);
      }
      return value;
    },
  }) as PrismaClient;
}
