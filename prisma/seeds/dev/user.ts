import { auth } from "$/utils/auth";
import { db } from "$/utils/db";
import { faker } from "@faker-js/faker";

// signUpEmail derives the new session's ipAddress/userAgent from the request
// headers passed here — without these, seeded sessions end up with empty
// values instead of something that looks like a real sign-in.
function fakeSignUpHeaders(): Headers {
  return new Headers({
    "x-forwarded-for": faker.internet.ip(),
    "user-agent": faker.internet.userAgent(),
  });
}

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

  await db.user.update({
    where: { email: "admin@test.com" },
    // twoFactorEnabled/emailVerified reflect a fully-onboarded admin, which
    // requireAdminMfaEnrolled now requires for admin console/API access.
    // There's no matching TwoFactor secret row, so this account can't
    // actually complete a TOTP challenge -- fine for a fixture that only
    // needs to pass the gate, not sign in with a real second factor.
    data: { role: "admin", twoFactorEnabled: true, emailVerified: true },
  });
}
