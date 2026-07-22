import { db } from "$/utils/db";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, afterEach, beforeAll } from "bun:test";

// A concrete url (rather than the default "about:blank") is required for
// history.pushState/replaceState to actually update window.location —
// against about:blank they silently no-op instead of navigating, which
// breaks tests of components that drive routing (e.g. wouter) via history.
GlobalRegistrator.register({ url: "http://localhost/" });

// Imported after register() so @testing-library/react sees a live DOM on init,
// and its internal beforeAll() runs at module load time (not inside a test).
const { cleanup } = await import("@testing-library/react");

// Auth tables are left untouched between tests. Login sessions are created in
// each suite's beforeAll (after the snapshot is taken), so resetting them would
// invalidate the cookies every test relies on.
const AUTH_TABLES = ["user", "session", "account", "verification"];

// Tables we snapshot after seeding and restore between tests, plus the
// serial-backed columns whose sequences we reset. Both are captured in beforeAll
// so we don't re-query the catalog on every reset.
let domainTables: string[] = [];
let sequenceColumns: Array<{ table: string; column: string }> = [];

async function getDomainTables() {
  const rows = await db.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename != '_prisma_migrations'
      AND tablename NOT LIKE '__snap__%'
  `;
  return rows.map((r) => r.tablename).filter((t) => !AUTH_TABLES.includes(t));
}

async function getSequenceColumns(tables: string[]) {
  const rows = await db.$queryRaw<
    Array<{ table_name: string; column_name: string }>
  >`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_default LIKE 'nextval(%'
  `;
  return rows
    .filter((r) => tables.includes(r.table_name))
    .map((r) => ({ table: r.table_name, column: r.column_name }));
}

if (!process.env.SKIP_DB_SETUP) {
  beforeAll(async () => {
    await Bun.$`bunx --bun prisma migrate reset --force`;
    await Bun.$`bun db:seed`;

    // Snapshot the seeded baseline. Each table is copied verbatim (ids and all)
    // so restoring puts every seeded/migration row back exactly where it was.
    domainTables = await getDomainTables();
    sequenceColumns = await getSequenceColumns(domainTables);
    for (const table of domainTables) {
      await db.$executeRawUnsafe(`DROP TABLE IF EXISTS "__snap__${table}"`);
      await db.$executeRawUnsafe(
        `CREATE TABLE "__snap__${table}" AS TABLE "${table}"`,
      );
    }
  });

  // Drop the snapshot tables so they don't linger in the dev database.
  afterAll(async () => {
    for (const table of domainTables) {
      await db.$executeRawUnsafe(`DROP TABLE IF EXISTS "__snap__${table}"`);
    }
  });

  // Reset the database to the seeded baseline after every test. We truncate and
  // re-insert from the snapshot inside a single interactive transaction so the
  // `SET LOCAL session_replication_role` (which disables FK/trigger checks, so
  // insertion order doesn't matter) is pinned to one pooled connection. Each
  // sequence is then reset to its restored max so app-created rows get the same
  // ids in every run regardless of how many tests ran before — without this,
  // ids climb across the whole process and depend on test execution order.
  afterEach(async () => {
    if (domainTables.length === 0) return;

    const quoted = domainTables.map((t) => `"${t}"`).join(", ");
    await db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SET LOCAL session_replication_role = 'replica'`,
      );
      await tx.$executeRawUnsafe(`TRUNCATE TABLE ${quoted} CASCADE`);
      for (const table of domainTables) {
        await tx.$executeRawUnsafe(
          `INSERT INTO "${table}" SELECT * FROM "__snap__${table}"`,
        );
      }
      for (const { table, column } of sequenceColumns) {
        await tx.$executeRawUnsafe(
          `SELECT setval(
             pg_get_serial_sequence('"${table}"', '${column}'),
             COALESCE((SELECT MAX("${column}") FROM "${table}"), 1),
             (SELECT MAX("${column}") FROM "${table}") IS NOT NULL
           )`,
        );
      }
    });
  });
}

afterEach(() => {
  cleanup();
});
