self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener("fetch", (event) => {
  // No caching — pure passthrough. This exists purely to satisfy Chrome's
  // "registered service worker with a fetch handler" install-prompt and
  // Lighthouse installability criteria. Offline caching is still out of
  // scope for this app.
  event.respondWith(fetch(event.request));
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Outpost", {
      body: data.body,
      icon: "/icons/icon-192.png",
      data: { referenceUrl: data.referenceUrl },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // A push notification only ever reaches someone who's already signed in
  // on this device, so land on the dashboard rather than "/" (the
  // signed-out marketing page) when there's no more specific referenceUrl.
  const referenceUrl = event.notification.data?.referenceUrl ?? "/dashboard";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            // The SW can't reach React/wouter directly -- postMessage tells
            // the already-open page to navigate itself (no full reload)
            // rather than hard-navigating the client here.
            client.postMessage({ type: "navigate", referenceUrl });
            return client.focus();
          }
        }
        return self.clients.openWindow(referenceUrl);
      }),
  );
});
