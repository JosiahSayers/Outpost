import { db } from "$/utils/db";
import { make } from "./make";

// Provision extra active sessions for a user, on top of whatever session
// their sign-up already created. Used to push a user's session list past a
// single page in admin e2e tests.
export async function seedActiveSessions(userId: string, count: number) {
  await db.session.createMany({
    data: Array.from({ length: count }, () =>
      make("Session", {
        userId,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      }),
    ),
  });
}
