import * as Sentry from "@sentry/bun";

// Ensure to call this before importing any other modules!
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [Sentry.expressIntegration()],
  environment: process.env.ENVIRONMENT,
  release: process.env.COMMIT_SHA, // change to version once that starts being used
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  enableLogs: true,
  beforeSend(event) {
    // /api/auth (Better Auth) accepts passwords in the request body, which would
    // otherwise be captured verbatim on error. Scrub just those requests rather
    // than disabling body/user capture globally via `dataCollection`.
    if (event.request?.url?.includes("/api/auth")) {
      delete event.request.data;
      delete event.user;
    }
    return event;
  },
});
