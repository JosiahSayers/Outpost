import { useResolvedSession } from "$/frontend/utils/guards/use-resolved-session";
import { reportStorageBeacon } from "$/frontend/utils/storage-beacon";
import { useEffect, useRef } from "react";

/**
 * Reports the storage beacon (see storage-beacon.ts) once per page load, as
 * soon as the session has settled either way. Mounted globally rather than
 * from a route guard because the load under investigation lands on `/`,
 * which is public and runs no guard at all.
 *
 * `report` and `useSession` default to the real implementations; tests
 * inject stubs instead of reaching for `mock.module`.
 */
export function useStorageBeacon(
  report: typeof reportStorageBeacon = reportStorageBeacon,
  useSession: typeof useResolvedSession = useResolvedSession,
) {
  const session = useSession();
  const reported = useRef(false);

  useEffect(() => {
    // useResolvedSession reports a transient (non-401) failure as still
    // pending while it retries, so waiting for it to settle keeps ordinary
    // network flakiness from being recorded as a missing session.
    if (session.isPending || reported.current) {
      return;
    }

    reported.current = true;
    report(!!session.data?.user);
  }, [session.isPending, session.data]);
}
