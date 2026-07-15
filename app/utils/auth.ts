import { sendResetPasswordEmailQueue } from "$/jobs/queues";
import { db } from "$/utils/db";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";
import { admin } from "better-auth/plugins";

export const baseAuthConfig = {
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }, request) => {
      sendResetPasswordEmailQueue.add(user.email, { user, url });
    },
  },
  plugins: [admin()],
} satisfies BetterAuthOptions;

export const auth = betterAuth(baseAuthConfig);

export type Session = typeof auth.$Infer.Session;
