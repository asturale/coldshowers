// A registered fetch handler is required by some browsers' PWA
// installability check, even a plain passthrough -- always hits the
// network, no offline caching.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // Non-JSON payload -- fall back to defaults below.
  }
  const title = data.title || 'Cold Showers';
  const options = {
    body: data.body || '',
    // Without these the OS falls back to the browser's own icon (e.g.
    // Brave's logo on Android) instead of the app's.
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(self.clients.openWindow(url));
});
