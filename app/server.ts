import { attachLogger } from "$/middleware/attach-logger";
import { ipRateLimiter } from "$/middleware/rate-limit";
import { requestLogger } from "$/middleware/request-logger";
import { stashRequestMetadata } from "$/middleware/stash-request-meta";
import { stashSession } from "$/middleware/stash-session";
import { adminRouter } from "$/routers/admin";
import { apiRouter } from "$/routers/api";
import { emailAssetsRouter } from "$/routers/email-assets";
import { frontendRouter } from "$/routers/frontend";
import { healthRouter } from "$/routers/health";
import { pwaAssetsRouter } from "$/routers/pwa-assets";
import { sentryTunnelRouter } from "$/routers/sentry-tunnel";
import { auth } from "$/utils/auth";
import { CLOUDFLARE_PROXY_RANGES } from "$/utils/cloudflare-proxy-ranges";
import * as Sentry from "@sentry/bun";
import { toNodeHandler } from "better-auth/node";
import express from "express";

export const app = express();

// In production, traffic reaches the app as client -> Cloudflare -> Caddy ->
// app (see docker-compose.staging.yml). Express's trust-proxy walk starts
// at the actual socket peer (Caddy's docker-network IP) and, for each
// entry, checks whether *that address itself* falls in a trusted range --
// unlike a numeric hop count, it doesn't just trust the first N positions
// blindly. So both hops need to be listed: the docker bridge subnet (for
// Caddy, the immediate peer) and Cloudflare's edge ranges (for the
// X-Forwarded-For entry Caddy appends on Cloudflare's behalf once it
// trusts it -- see the Caddyfile's own trusted_proxies). Only what's left
// after both are stripped -- the real client entry -- becomes req.ip.
// Left disabled elsewhere so a client can't spoof its own IP by setting
// X-Forwarded-For directly, since nothing there strips it.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", ["172.16.0.0/12", ...CLOUDFLARE_PROXY_RANGES]);
}

app.use(stashRequestMetadata, attachLogger, requestLogger);
app.use(ipRateLimiter);
// Mounted under /api so it rides the existing Caddy proxy rule for /api/*
// (see docker-compose.staging.yml), and ahead of stashSession since it
// doesn't need the caller's auth session resolved.
app.use("/api/monitoring", sentryTunnelRouter);
app.use(stashSession);

app.all("/api/auth/{*any}", toNodeHandler(auth));
app.disable("x-powered-by");

app.use(express.json());

app.use(healthRouter);
app.use("/api", apiRouter);
app.use("/admin", adminRouter);

if (process.env.NODE_ENV !== "production") {
  // In production Caddy serves /email-assets directly from a shared
  // volume (docker-compose.staging.yml); this stands in for that locally.
  app.use("/email-assets", emailAssetsRouter);
  app.use(pwaAssetsRouter);
  app.use(frontendRouter); // Needs to be the final router
}

Sentry.setupExpressErrorHandler(app);
