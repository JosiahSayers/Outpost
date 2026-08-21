import * as Sentry from "@sentry/react";

// Must be the first import in the entry file — see index.tsx.
Sentry.init({
  dsn: process.env.BUN_PUBLIC_SENTRY_DSN,
  environment: process.env.BUN_PUBLIC_ENVIRONMENT,
  release: process.env.BUN_PUBLIC_SHA,
  // Route envelopes through our own origin rather than posting directly to
  // Sentry's ingest domain -- content blockers and Safari's cross-site
  // tracking prevention (especially on iOS) commonly block that direct
  // request, silently dropping error/replay reports. See
  // app/routers/sentry-tunnel.ts.
  tunnel: "/api/monitoring",
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

    // A `webkit-masked-url://hidden/` frame means Safari refused to expose
    // the throwing script's real source -- WebKit does this for any script
    // without CORS headers, first-party or third-party, so it doesn't by
    // itself tell us where the code came from (see OUTPOST-E). We can't see
    // past that wall, but we can at least capture the page state at the
    // moment it happened, since that's otherwise lost once the event report
    // is all we have left to go on.
    const hasMaskedFrame = event.exception?.values?.some((value) =>
      value.stacktrace?.frames?.some((frame) =>
        frame.filename?.startsWith("webkit-masked-url:"),
      ),
    );
    if (hasMaskedFrame && typeof document !== "undefined") {
      event.contexts = {
        ...event.contexts,
        masked_script_diagnostics: {
          visibilityState: document.visibilityState,
          pathname: window.location.pathname,
          referrer: document.referrer || null,
          capturedAt: new Date().toISOString(),
        },
      };
    }

    return event;
  },
});
