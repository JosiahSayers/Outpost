import { useEffect, useRef, useState } from "react";

interface UseDelayedLoadingOptions {
  /** How long the raw loading flag must be true before the spinner shows. */
  delayMs?: number;
  /** Once shown, the minimum time the spinner stays visible. */
  minDurationMs?: number;
}

interface UseDelayedLoadingResult {
  /**
   * Mirrors the raw flag, but stays true until `minDurationMs` has elapsed
   * since the spinner last shown -- gate "loaded" content on `!isLoading`
   * (not the raw flag) so a fast finish can't reveal content before the
   * spinner's minimum display time is up.
   */
  isLoading: boolean;
  /** True only once `delayMs` has passed -- whether to render a spinner (vs. nothing) while `isLoading` is true. */
  showSpinner: boolean;
}

/**
 * Debounces a loading flag so brief loads never render a loading state, and
 * (optionally) so a loading state that does show doesn't flash off again
 * before `minDurationMs` has elapsed.
 */
export function useDelayedLoading(
  rawIsLoading: boolean,
  { delayMs = 400, minDurationMs = 400 }: UseDelayedLoadingOptions = {},
): UseDelayedLoadingResult {
  const [showSpinner, setShowSpinner] = useState(false);
  const shownAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (rawIsLoading) {
      const timeout = setTimeout(() => {
        shownAtRef.current = Date.now();
        setShowSpinner(true);
      }, delayMs);
      return () => clearTimeout(timeout);
    }

    if (shownAtRef.current === null) {
      setShowSpinner(false);
      return;
    }

    const remaining = minDurationMs - (Date.now() - shownAtRef.current);
    if (remaining <= 0) {
      shownAtRef.current = null;
      setShowSpinner(false);
      return;
    }

    const timeout = setTimeout(() => {
      shownAtRef.current = null;
      setShowSpinner(false);
    }, remaining);
    return () => clearTimeout(timeout);
  }, [rawIsLoading, delayMs, minDurationMs]);

  return { isLoading: rawIsLoading || showSpinner, showSpinner };
}
