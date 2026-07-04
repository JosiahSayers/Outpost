import { attachLogger } from "$/middleware/attach-logger";
import { requireAdminRole } from "$/middleware/authorization/require-admin-role";
import { requestLogger } from "$/middleware/request-logger";
import { requireValidSession } from "$/middleware/require-valid-session";
import { stashRequestMetadata } from "$/middleware/stash-request-meta";
import { stashSession } from "$/middleware/stash-session";
import { apiRouter } from "$/routers/api";
import { bullBoardRouter } from "$/routers/bull-board";
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
app.use(
  "/admin/queues",
  requireValidSession,
  requireAdminRole,
  bullBoardRouter,
);

if (process.env.NODE_ENV !== "production") {
  app.use(frontendRouter); // Needs to be the final router
}
