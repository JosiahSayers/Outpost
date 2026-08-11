import { sendPasswordChangedEmailQueue } from "$/jobs/workers/email/password-changed";
import { sendResetPasswordEmailQueue } from "$/jobs/workers/email/reset-password";
import { sendVerifyEmailQueue } from "$/jobs/workers/email/verify-email";
import { db } from "$/utils/db";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware } from "better-auth/api";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";
import { admin, twoFactor } from "better-auth/plugins";

export const baseAuthConfig = {
  appName: "Outpost",
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
  // Verification isn't required to sign in yet -- admins alone are gated on
  // it (requireAdminMfaEnrolled), everyone else can leave their email
  // unverified indefinitely. This just makes verification possible: new
  // users get sent a link on sign-up, and existing users can trigger one
  // themselves from the Profile tab's "resend" action.
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      sendVerifyEmailQueue.add(user.email, { user, url });
    },
    sendOnSignUp: false,
    // Without this, /verify-email updates the DB row but never refreshes
    // the session's cookie cache -- the client keeps reading the stale
    // cached emailVerified value for up to cookieCache.maxAge (5 minutes)
    // until a new session is created (e.g. signing back in).
    autoSignInAfterVerification: true,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
      strategy: "compact",
    },
  },
  // Enabled by default in production only (Better Auth's own default), with
  // stricter rules for the endpoints most worth throttling beyond sign-in
  // (which already defaults to 3 requests/10s). "/sign-in/email" is left
  // alone to keep that built-in default.
  rateLimit: {
    customRules: {
      "/sign-up/email": { window: 60, max: 5 },
      "/request-password-reset": { window: 60, max: 3 },
      "/send-verification-email": { window: 60, max: 3 },
    },
  },
  advanced: {
    ipAddress: {
      // Caddy is the only reverse proxy in front of the app in production
      // (docker-compose.staging.yml), and the app's port isn't published to
      // the host, so only containers on the docker network can reach it.
      // Trusting that range lets a client-spoofed X-Forwarded-For entry be
      // stripped down to the real client IP instead of the header being
      // discarded outright (Better Auth's default when it can't tell which
      // hop to trust). Left empty elsewhere since there's no proxy to trust.
      trustedProxies:
        process.env.NODE_ENV === "production" ? ["172.16.0.0/12"] : [],
    },
  },
  plugins: [admin(), twoFactor()],
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/change-password") {
        const user = ctx.context.session?.user;
        if (user) {
          sendPasswordChangedEmailQueue.add(user.email, { user });
        }
      }
    }),
  },
} satisfies BetterAuthOptions;

export const auth = betterAuth(baseAuthConfig);

export type Session = typeof auth.$Infer.Session;
