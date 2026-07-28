import { useEffect, useRef, useState } from "react";

interface UseDelayedLoadingOptions {
  /** How long `isLoading` must be true before the loading state shows. */
  delayMs?: number;
  /** Once shown, the minimum time the loading state stays visible. */
  minDurationMs?: number;
}

/**
 * Debounces a loading flag so brief loads never render a loading state, and
 * (optionally) so a loading state that does show doesn't flash off again
 * before `minDurationMs` has elapsed.
 */
export function useDelayedLoading(
  isLoading: boolean,
  { delayMs = 400, minDurationMs = 400 }: UseDelayedLoadingOptions = {},
): boolean {
  const [showLoading, setShowLoading] = useState(false);
  const shownAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        shownAtRef.current = Date.now();
        setShowLoading(true);
      }, delayMs);
      return () => clearTimeout(timeout);
    }

    if (shownAtRef.current === null) {
      setShowLoading(false);
      return;
    }

    const remaining = minDurationMs - (Date.now() - shownAtRef.current);
    if (remaining <= 0) {
      shownAtRef.current = null;
      setShowLoading(false);
      return;
    }

    const timeout = setTimeout(() => {
      shownAtRef.current = null;
      setShowLoading(false);
    }, remaining);
    return () => clearTimeout(timeout);
  }, [isLoading, delayMs, minDurationMs]);

  return showLoading;
}
