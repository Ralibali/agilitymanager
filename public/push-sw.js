// Service worker enbart för push-notiser om tävlingsanmälningar.
// Cachar ingenting och påverkar inte hur sidan laddas.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "AgilityManager", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "AgilityManager";
  const options = {
    body: payload.body || "",
    data: { url: payload.url || "/tavlingar/favoriter" },
    tag: payload.tag || undefined,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/tavlingar/favoriter";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
