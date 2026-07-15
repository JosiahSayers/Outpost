import { attachLogger } from "$/middleware/attach-logger";
import { requestLogger } from "$/middleware/request-logger";
import { stashRequestMetadata } from "$/middleware/stash-request-meta";
import { stashSession } from "$/middleware/stash-session";
import { adminRouter } from "$/routers/admin";
import { apiRouter } from "$/routers/api";
import { emailAssetsRouter } from "$/routers/email-assets";
import { frontendRouter } from "$/routers/frontend";
import { healthRouter } from "$/routers/health";
import { auth } from "$/utils/auth";
import { toNodeHandler } from "better-auth/node";
import express from "express";

export const app = express();
app.use(stashRequestMetadata, attachLogger, requestLogger, stashSession);

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
  app.use(frontendRouter); // Needs to be the final router
}
