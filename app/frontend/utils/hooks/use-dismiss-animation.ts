import { useEffect, useRef, useState } from "react";

export const DISMISS_ANIMATION_MS = 200;

/**
 * Tracks which ids are mid dismiss-animation so a row can play its exit
 * transition before it actually leaves the list. `onComplete` (typically an
 * optimistic-removal mutation) fires after the animation, not on click, so
 * the item stays in the data the caller renders from until it's already
 * collapsed to nothing.
 */
export function useDismissAnimation(onComplete: (id: string) => void) {
  const [dismissingIds, setDismissingIds] = useState<Set<string>>(new Set());
  const timeouts = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const pending = timeouts.current;
    return () => pending.forEach((timeout) => clearTimeout(timeout));
  }, []);

  const beginDismiss = (id: string) => {
    setDismissingIds((prev) => new Set(prev).add(id));
    const timeout = setTimeout(() => {
      timeouts.current.delete(id);
      onCompleteRef.current(id);
      setDismissingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, DISMISS_ANIMATION_MS);
    timeouts.current.set(id, timeout);
  };

  return { dismissingIds, beginDismiss };
}
