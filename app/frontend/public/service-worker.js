self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener("fetch", (event) => {
  // No caching — pure passthrough. This exists purely to satisfy Chrome's
  // "registered service worker with a fetch handler" install-prompt and
  // Lighthouse installability criteria. Phase 2 extends this file with
  // push/notificationclick handlers; offline caching is still out of scope.
  event.respondWith(fetch(event.request));
});
