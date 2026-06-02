import express from "express";
import { stashRequestMetadata } from "$/middleware/stash-request-meta";
import { healthRouter } from "$/routers/health";
import { attachLogger } from "$/middleware/attach-logger";
import { requestLogger } from "$/middleware/request-logger";
import { toNodeHandler } from "better-auth/node";
import { auth } from "$/utils/auth";
import { frontendRouter } from "$/routers/frontend";
import { apiRouter } from "$/routers/api";
import { stashSession } from "$/middleware/stash-session";

export const app = express();
app.use(stashRequestMetadata, attachLogger, requestLogger, stashSession);
app.all("/api/auth/{*any}", toNodeHandler(auth));
app.disable("x-powered-by");

app.use(express.json());

app.use(healthRouter);
app.use("/api", apiRouter);
app.use(frontendRouter); // Needs to be the final router
