import { sendPasswordChangedEmailQueue } from "$/jobs/workers/email/password-changed";
import { sendResetPasswordEmailQueue } from "$/jobs/workers/email/reset-password";
import { sendVerifyEmailQueue } from "$/jobs/workers/email/verify-email";
import { CLOUDFLARE_PROXY_RANGES } from "$/utils/cloudflare-proxy-ranges";
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
    // Temporarily disabled while investigating OUTPOST-E -- this forces
    // every session check to hit the DB directly instead of trusting the
    // cached cookie, to test whether the cookieCache's compact-strategy
    // normalization is implicated in the redirect-loop bug. See BTP-150
    // for findings; re-enable once resolved.
    // cookieCache: {
    //   enabled: true,
    //   maxAge: 5 * 60,
    //   strategy: "compact",
    // },
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
      // Better Auth resolves the client IP by walking X-Forwarded-For from
      // the right and skipping entries that match trustedProxies -- it
      // only looks at the header's own values, never the actual socket
      // peer. In production the header arrives as "<real client>,
      // <cloudflare edge ip>" (Caddy appends its own connecting peer, which
      // is Cloudflare, once the Caddyfile trusts it -- see
      // docker-compose.staging.yml). So this must list Cloudflare's ranges
      // (the entry that needs skipping), not the docker-bridge subnet,
      // which never appears inside the header text at all. Left empty
      // elsewhere since there's no proxy to trust.
      trustedProxies:
        process.env.NODE_ENV === "production" ? CLOUDFLARE_PROXY_RANGES : [],
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
