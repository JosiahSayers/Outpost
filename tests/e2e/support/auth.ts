// Playwright's CLI runs under plain Node, so it needs .env loaded explicitly
// (the same reason playwright.config.ts imports it).
import "dotenv/config";

import { db } from "$/utils/db";
import { seedGearInventory } from "../../helpers/test-data/seed-gear";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { betterAuth } from "better-auth/minimal";
import { admin } from "better-auth/plugins";

// A minimal Better Auth instance for provisioning users straight from the test
// process. It deliberately mirrors the app's `baseAuthConfig` but drops the
// `sendResetPassword` handler, because that pulls in the BullMQ queues (and a
// Redis connection) which the Playwright host process has no need for. User
// creation only writes rows to the DB — password hashing is self-contained and
// independent of BETTER_AUTH_SECRET, so users minted here sign in cleanly
// through the real app server.
const provisioningAuth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  plugins: [admin()],
});

export type TestUser = {
  id: string;
  email: string;
  password: string;
  name: string;
};

export type CreateUserOptions = {
  admin?: boolean;
  seedGear?: boolean;
  name?: string;
};

const DEFAULT_PASSWORD = "e2e-test-password";

// Globally-unique email so parallel workers never collide on the unique
// constraint. randomUUID is collision-free across processes, unlike Date.now().
export function uniqueEmail(prefix = "e2e"): string {
  return `${prefix}-${crypto.randomUUID()}@test.com`;
}

// Create a fresh, isolated user in the database. Does not touch any browser
// session — callers sign the user in via `signInAs` when they want a page
// authenticated as this user.
export async function createUser(
  options: CreateUserOptions = {},
): Promise<TestUser> {
  const email = uniqueEmail(options.admin ? "e2e-admin" : "e2e");
  const name = options.name ?? "E2E User";
  const password = DEFAULT_PASSWORD;

  const { user } = await provisioningAuth.api.signUpEmail({
    body: { name, email, password },
  });

  // Promote before any session is created so the session reflects the role.
  if (options.admin) {
    await db.user.update({ where: { id: user.id }, data: { role: "admin" } });
  }

  if (options.seedGear) {
    await seedGearInventory(user.id);
  }

  return { id: user.id, email, password, name };
}
