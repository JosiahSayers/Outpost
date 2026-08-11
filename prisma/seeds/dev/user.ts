import { auth, baseAuthConfig } from "$/utils/auth";
import { db } from "$/utils/db";
import { base32 } from "@better-auth/utils/base32";
import { faker } from "@faker-js/faker";
import { betterAuth } from "better-auth";
import { testUtils } from "better-auth/plugins";

// signUpEmail derives the new session's ipAddress/userAgent from the request
// headers passed here — without these, seeded sessions end up with empty
// values instead of something that looks like a real sign-in.
function fakeSignUpHeaders(): Headers {
  return new Headers({
    "x-forwarded-for": faker.internet.ip(),
    "user-agent": faker.internet.userAgent(),
  });
}

// Used only to mint a session directly (bypassing credentials/2FA), the same
// way tests/helpers/auth.ts does, so enrollAdminMfa below can drive the real
// enable/verify endpoints as if a signed-in admin were sitting at the
// account settings page.
const seedAuth = betterAuth({ ...baseAuthConfig, plugins: [testUtils()] });

export async function createUsers() {
  await Promise.all([
    auth.api.signUpEmail({
      body: {
        name: faker.person.fullName(),
        email: "user@test.com",
        password: "user-password",
      },
      headers: fakeSignUpHeaders(),
    }),
    auth.api.signUpEmail({
      body: {
        name: faker.person.fullName(),
        email: "user2@test.com",
        password: "user2-password",
      },
      headers: fakeSignUpHeaders(),
    }),
    auth.api.signUpEmail({
      body: {
        name: faker.person.fullName(),
        email: "admin@test.com",
        password: "admin-password",
      },
      headers: fakeSignUpHeaders(),
    }),
  ]);

  const admin = await db.user.update({
    where: { email: "admin@test.com" },
    // emailVerified reflects a fully-onboarded admin; requireAdminMfaEnrolled
    // additionally requires a real MFA enrollment, done below.
    data: { role: "admin", emailVerified: true },
  });

  await enrollAdminMfa(admin.id);
}

// requireAdminMfaEnrolled gates admin console/API access on twoFactorEnabled,
// so the seeded admin needs a *working* TOTP enrollment, not just the flag --
// otherwise the twoFactor plugin still intercepts /sign-in/email and demands
// a code this account has no way to produce, making `bun dev` sign-in as
// admin@test.com impossible. Each reset generates a fresh secret (better-auth
// has no way to enroll with a caller-supplied one), so it's logged here
// every run instead of going stale after the first.
async function enrollAdminMfa(userId: string) {
  const { cookies } = await seedAuth.$context
    .then((context) => context.test)
    .then((test) => test.login({ userId }));
  const headers = new Headers({
    Cookie: cookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; "),
  });

  // Drop any half-enrolled row a previous run/import might have left.
  await db.twoFactor.deleteMany({ where: { userId } });

  const { totpURI, backupCodes } = await auth.api.enableTwoFactor({
    body: { password: "admin-password" },
    headers,
  });

  // The URI's secret is base32-encoded for authenticator apps; generateTOTP
  // expects the raw pre-encoding secret.
  const base32Secret = new URL(totpURI).searchParams.get("secret")!;
  const secret = new TextDecoder().decode(base32.decode(base32Secret));
  const { code } = await auth.api.generateTOTP({ body: { secret } });
  await auth.api.verifyTOTP({ body: { code }, headers });

  console.log(`admin@test.com MFA secret (manual entry): ${base32Secret}`);
  console.log(`admin@test.com MFA backup codes: ${backupCodes.join(", ")}`);
}
