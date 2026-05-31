import { db } from "$/utils/db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { testUtils } from "better-auth/plugins";

export const baseAuthConfig = {
  database: prismaAdapter(db, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
  },
};

export const auth = betterAuth(baseAuthConfig);

export type Session = typeof auth.$Infer.Session;
