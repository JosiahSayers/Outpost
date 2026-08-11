// Playwright's CLI runs under plain Node, so it needs .env loaded explicitly
// (the same reason playwright.config.ts imports it).
import "dotenv/config";

import { db } from "$/utils/db";
import { seedGearInventory } from "../../helpers/test-data/seed-gear";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { betterAuth } from "better-auth/minimal";
import { admin, testUtils } from "better-auth/plugins";

// A minimal Better Auth instance for provisioning users straight from the test
// process. It deliberately mirrors the app's `baseAuthConfig` but drops the
// `sendResetPassword` handler, because that pulls in the BullMQ queues (and a
// Redis connection) which the Playwright host process has no need for. User
// creation only writes rows to the DB — password hashing is self-contained and
// independent of BETTER_AUTH_SECRET, so users minted here sign in cleanly
// through the real app server.
//
// testUtils() lets `signInAs` (fixtures.ts) mint a session directly instead
// of going through the real credential-based /sign-in/email endpoint. That
// matters for admin fixtures: the real app's twoFactor plugin intercepts
// /sign-in/email for any user with twoFactorEnabled set and issues a 2FA
// challenge instead of completing the sign-in, discarding the session
// entirely -- there's no real TOTP secret for these fixtures to answer that
// challenge with, so a real credential sign-in for an admin fixture would
// never produce a session.
const provisioningAuth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  plugins: [admin(), testUtils()],
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

// Mints a session directly (bypassing credential + 2FA checks) and returns it
// as Playwright-compatible cookie objects. See the testUtils() comment above
// for why signInAs (fixtures.ts) needs this instead of a real sign-in POST.
export async function getSessionCookies(userId: string) {
  const test = await provisioningAuth.$context.then((ctx) => ctx.test);
  const { cookies } = await test.login({ userId });
  return cookies;
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
  // twoFactorEnabled/emailVerified reflect a fully-onboarded admin, which
  // requireAdminMfaEnrolled and useAdminGuard now require for admin
  // console/API access -- see prisma/seeds/dev/user.ts for the same fix
  // applied to the dev/integration-test admin fixture.
  if (options.admin) {
    await db.user.update({
      where: { id: user.id },
      data: { role: "admin", twoFactorEnabled: true, emailVerified: true },
    });
  }

  if (options.seedGear) {
    await seedGearInventory(user.id);
  }

  return { id: user.id, email, password, name };
}
