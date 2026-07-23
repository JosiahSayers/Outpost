// "ResizeObserver loop completed with undelivered notifications" (and the older
// "ResizeObserver loop limit exceeded") is a benign browser notice: it fires
// when a ResizeObserver callback triggers another layout change in the same
// frame — which Mantine's Combobox/Popover positioning does routinely — so the
// browser defers the remaining work to the next frame. Nothing actually breaks,
// but the browser dispatches it as a global `error` event, which Bun's dev
// overlay renders as a fatal Runtime Error.
//
// We can't reliably swallow it via a window `error` listener: the overlay
// registers its own listener before app code runs, and `error` events on
// `window` fire at-target in registration order, so a later
// stopImmediatePropagation can't preempt it. Instead we stop the browser from
// ever raising it, by deferring each ResizeObserver callback to the next frame.
// That breaks the synchronous observe → resize → observe loop while keeping the
// callback's behavior intact (a one-frame delay is imperceptible for layout).
export function suppressResizeObserverError() {
  if (typeof window === "undefined" || !window.ResizeObserver) return;

  const NativeResizeObserver = window.ResizeObserver;

  window.ResizeObserver = class extends NativeResizeObserver {
    constructor(callback: ResizeObserverCallback) {
      super((entries, observer) => {
        window.requestAnimationFrame(() => {
          callback(entries, observer);
        });
      });
    }
  };
}
