import { sendEmailQueue } from "$/jobs/workers/email/send-email";
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
      sendEmailQueue.add(user.email, {
        userId: user.id,
        to: user.email,
        notificationSettingName: null,
        content: {
          template: "reset-password",
          props: { userName: user.name, resetUrl: url },
        },
      });
    },
  },
  // Verification isn't required to sign in yet -- admins alone are gated on
  // it (requireAdminMfaEnrolled), everyone else can leave their email
  // unverified indefinitely. This just makes verification possible: new
  // users get sent a link on sign-up, and existing users can trigger one
  // themselves from the Profile tab's "resend" action.
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      sendEmailQueue.add(user.email, {
        userId: user.id,
        to: user.email,
        notificationSettingName: null,
        content: {
          template: "verify-email",
          props: { userName: user.name, verifyUrl: url },
        },
      });
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
      // Deliberately short. While the cache is live nothing re-reads the
      // session row, so a revoked or expired session keeps working until it
      // lapses -- that window is the whole cost of caching here. A minute
      // still absorbs the bulk of per-request session lookups while keeping
      // revocation fast enough to feel immediate.
      maxAge: 60,
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
          sendEmailQueue.add(user.email, {
            userId: user.id,
            to: user.email,
            notificationSettingName: null,
            content: {
              template: "password-changed",
              props: { userName: user.name },
            },
          });
        }
      }
    }),
  },
} satisfies BetterAuthOptions;

export const auth = betterAuth(baseAuthConfig);

export type Session = typeof auth.$Infer.Session;
