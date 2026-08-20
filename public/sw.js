const CACHE_NAME = "proplushka-static-v3";
const PRECACHE_ASSETS = [
  "/manifest.webmanifest",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];
const CACHEABLE_PREFIXES = ["/_next/static/", "/icons/", "/images/client/", "/images/company/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  const cacheable =
    PRECACHE_ASSETS.includes(url.pathname) || CACHEABLE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));

  if (!cacheable) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type === "opaque") {
          return response;
        }

        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    }),
  );
});

self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "ПроПлюшка", body: event.data?.text() || "Новое уведомление" };
  }

  const title = payload.title || "ПроПлюшка";
  const options = {
    body: payload.body || "Новое уведомление",
    icon: payload.icon || "/icons/icon-192.png",
    badge: payload.badge || "/icons/icon-192.png",
    tag: payload.tag || "proplushka-notification",
    data: { url: payload.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client && client.url === url) {
            return client.focus();
          }
        }

        return self.clients.openWindow(url);
      }),
  );
});
