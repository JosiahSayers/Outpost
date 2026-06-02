import { baseAuthConfig } from "$/utils/auth";
import { db } from "$/utils/db";
import { betterAuth } from "better-auth";
import { testUtils } from "better-auth/plugins";

export const testAuth = betterAuth({
  ...baseAuthConfig,
  plugins: [testUtils()],
});

export async function getAuthCookies(email = "user@test.com") {
  const user = await db.user.findUnique({ where: { email } });
  const { cookies } = await testAuth.$context
    .then((context) => context.test)
    .then((test) => test.login({ userId: user!.id }));

  return cookies.map((cookie) => `${cookie.name}=${cookie.value}`);
}
