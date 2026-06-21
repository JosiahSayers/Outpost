import { db } from "$/utils/db";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterEach, beforeAll, beforeEach } from "bun:test";

GlobalRegistrator.register();

// Imported after register() so @testing-library/react sees a live DOM on init,
// and its internal beforeAll() runs at module load time (not inside a test).
const { cleanup } = await import("@testing-library/react");

if (!process.env.SKIP_DB_SETUP) {
  beforeAll(async () => {
    await Bun.$`bunx -bun prisma migrate reset --force`;
    await Bun.$`bun db:seed`;
  });

  beforeEach(() => {
    db.$executeRaw`SAVEPOINT before_test`;
  });

  afterEach(() => {
    db.$executeRaw`ROLLBACK TO SAVEPOINT before_test`;
  });
}

afterEach(() => {
  cleanup();
});
