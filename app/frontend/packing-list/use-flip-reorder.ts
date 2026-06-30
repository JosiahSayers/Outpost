import { useLayoutEffect, useRef } from "react";

/**
 * Animates list items to their new positions whenever their order changes,
 * using the FLIP technique (measure First/Last positions, Invert the delta,
 * then Play the transition). Because it measures real rendered rects it works
 * even inside a CSS multi-column flow, where transforms can't be derived from
 * layout alone.
 *
 * Register each item's DOM node with the returned `register` callback, keyed by
 * a stable id: `ref={register(item.id)}`. Before triggering a reorder, call
 * `markMoved(ids)` with the ids that intentionally changed order — only those
 * animate. This matters in a multi-column flow, where moving one item can
 * reflow the pixel position of every other item; animating those incidental
 * shifts looks like the whole list bouncing.
 */
type Position = { top: number; left: number };

export function useFlipReorder(durationMs = 250) {
  const refs = useRef(new Map<number, HTMLElement>());
  const callbacks = useRef(new Map<number, (el: HTMLElement | null) => void>());
  const prevPositions = useRef(new Map<number, Position>());
  const movedIds = useRef<Set<number> | null>(null);

  useLayoutEffect(() => {
    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const toAnimate = movedIds.current;

    // Reset any in-flight transforms so we read each node's true layout
    // position, then remember those positions for the next reorder. We use
    // offsetTop/offsetLeft (layout coords relative to the shared offsetParent)
    // rather than getBoundingClientRect — those are immune to scroll/page
    // shifts, which otherwise corrupt the delta when a column reflow changes
    // the document height.
    const nextPositions = new Map<number, Position>();
    refs.current.forEach((el, id) => {
      el.style.transition = "none";
      el.style.transform = "";
      nextPositions.set(id, { top: el.offsetTop, left: el.offsetLeft });
    });

    let animated = false;
    if (!reduceMotion && toAnimate) {
      refs.current.forEach((el, id) => {
        if (!toAnimate.has(id)) return;

        const prev = prevPositions.current.get(id);
        const next = nextPositions.get(id);
        if (!prev || !next) return;

        const dx = prev.left - next.left;
        const dy = prev.top - next.top;
        if (!dx && !dy) return;

        // Invert: jump the node back to where it was, then play to natural spot.
        el.style.transform = `translate(${dx}px, ${dy}px)`;
        requestAnimationFrame(() => {
          el.style.transition = `transform ${durationMs}ms ease`;
          el.style.transform = "";
        });
        animated = true;
      });
    }

    // Keep the pending-move marker until an animation actually plays. A reorder
    // driven by an async mutation can trigger an intermediate render (the
    // mutation entering its pending state) before the cache update renders the
    // new order; clearing eagerly there would swallow the animation.
    if (toAnimate && (animated || reduceMotion)) {
      movedIds.current = null;
    }

    prevPositions.current = nextPositions;
  });

  function register(id: number) {
    let cb = callbacks.current.get(id);
    if (!cb) {
      cb = (el: HTMLElement | null) => {
        if (el) refs.current.set(id, el);
        else refs.current.delete(id);
      };
      callbacks.current.set(id, cb);
    }
    return cb;
  }

  function markMoved(ids: number[]) {
    movedIds.current = new Set(ids);
  }

  return { register, markMoved };
}
