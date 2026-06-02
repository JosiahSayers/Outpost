import { db } from "$/utils/db";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

export const baseAuthConfig: BetterAuthOptions = {
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
};

export const auth = betterAuth(baseAuthConfig);

export type Session = typeof auth.$Infer.Session;
