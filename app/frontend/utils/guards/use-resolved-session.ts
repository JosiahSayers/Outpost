import { authClient } from "$/frontend/utils/auth-client";
import * as Sentry from "@sentry/react";
import { useEffect } from "react";

const RETRY_DELAY_MS = 2000;

// Better Auth's session store preserves the last-known session across a
// transient error (network failure, 502 during a deploy's brief restart
// window) so an already-open tab doesn't get bounced. But on a cold load
// there's nothing to preserve, and the store only auto-polls while it has
// session data — so a cold load that lands in that window would otherwise
// get stuck looking logged-out. Treat a non-401 error as "still resolving"
// rather than "signed out", and retry until it settles one way or the other.
export function useResolvedSession() {
  const session = authClient.useSession();
  const isTransientError = !!session.error && session.error.status !== 401;
  const user = session.data?.user;

  useEffect(() => {
    if (!isTransientError) {
      return;
    }

    // Surfaced as an unhandled promise rejection (OUTPOST-E) with nothing
    // but a minified frame to go on -- refetch() was never awaited or
    // caught here, so whatever it threw vanished into the console instead
    // of Sentry. Logging the real error also stops the rejection from
    // being unhandled in the first place.
    Sentry.logger.warn("Retrying session fetch after transient error", {
      status: session.error?.status ?? null,
      statusText: session.error?.statusText ?? null,
      message: session.error?.message ?? null,
    });

    const timeoutId = setTimeout(() => {
      session.refetch().catch((error: unknown) => {
        Sentry.logger.error("Session refetch after transient error failed", {
          error,
        });
      });
    }, RETRY_DELAY_MS);
    return () => clearTimeout(timeoutId);
  }, [isTransientError, session.refetch]);

  // Mirrors stashSession on the backend, which tags every request with the
  // resolved user -- without this, frontend errors/replays/logs carry no
  // user identity, so there's no way to filter Sentry down to "everything
  // for this one user" the way the backend already allows.
  useEffect(() => {
    Sentry.setUser(user ? { id: user.id, email: user.email } : null);
  }, [user?.id, user?.email]);

  if (isTransientError && !session.data?.user) {
    return { ...session, isPending: true };
  }

  return session;
}
