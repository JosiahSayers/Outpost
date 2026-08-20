import { useResolvedSession } from "$/frontend/utils/guards/use-resolved-session";
import { useSignOutContext } from "$/frontend/utils/sign-out-context";
import * as Sentry from "@sentry/react";
import { useLayoutEffect } from "react";
import { useLocation } from "wouter";

export function useAuthenticatedGuard() {
  const session = useResolvedSession();
  const [location, navigate] = useLocation();
  const { isSignOutInitiated } = useSignOutContext();

  useLayoutEffect(() => {
    if (!session.isPending && !session.data?.user && !isSignOutInitiated()) {
      // The server can tell a rejected session cookie apart from a missing
      // one (see stashSession), but not which browsing context the client
      // is in -- an "Add to Home Screen" standalone shell and an in-app
      // browser opened from another app can each look logged-out even while
      // a perfectly valid session sits unused in a regular Safari tab. This
      // is the one place that context is available, right as we bounce the
      // user back to sign-in involuntarily.
      Sentry.logger.warn("Redirecting unauthenticated user to sign-in", {
        path: location,
        sessionErrorStatus: session.error?.status ?? null,
        displayMode: window.matchMedia("(display-mode: standalone)").matches
          ? "standalone"
          : "browser",
        iosStandalone:
          (window.navigator as Navigator & { standalone?: boolean })
            .standalone ?? null,
        referrer: document.referrer || null,
        visibilityState: document.visibilityState,
      });
      navigate(`/sign-in?redirect=${encodeURIComponent(location)}`);
    }
  }, [session.data, session.isPending]);

  return session;
}
