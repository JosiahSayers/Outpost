import * as Sentry from "@sentry/react";

// Must be the first import in the entry file — see index.tsx.
Sentry.init({
  dsn: process.env.BUN_PUBLIC_SENTRY_DSN,
  environment: process.env.BUN_PUBLIC_ENVIRONMENT,
  release: process.env.BUN_PUBLIC_SHA,
  // Avoid collecting IP address (and the geo Sentry derives from it) —
  // GDPR treats both as personal data, and this app doesn't need them.
  dataCollection: {
    userInfo: false,
  },
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  enableLogs: true,
  beforeSend(event) {
    // The reset-password link carries a one-time token in the query string
    // (see reset-password.page.tsx) — strip it before it reaches Sentry.
    if (event.request?.url?.includes("/reset-password")) {
      event.request.url = event.request.url.replace(
        /([?&]token=)[^&]*/,
        "$1[Filtered]",
      );
    }
    return event;
  },
});
