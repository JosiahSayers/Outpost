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

    const timeoutId = setTimeout(() => session.refetch(), RETRY_DELAY_MS);
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
