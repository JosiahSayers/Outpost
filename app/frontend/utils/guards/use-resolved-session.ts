import { authClient } from "$/frontend/utils/auth-client";
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

  useEffect(() => {
    if (!isTransientError) {
      return;
    }

    const timeoutId = setTimeout(() => session.refetch(), RETRY_DELAY_MS);
    return () => clearTimeout(timeoutId);
  }, [isTransientError, session.refetch]);

  if (isTransientError && !session.data?.user) {
    return { ...session, isPending: true };
  }

  return session;
}
