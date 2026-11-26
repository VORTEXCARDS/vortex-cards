// VORTEX UNIT Push Service Worker
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; }
  catch (_) { payload = { body: event.data ? event.data.text() : '' }; }
  const title = payload.title || 'VORTEX UNIT';
  const options = {
    body: payload.body || 'У вас новое уведомление.',
    icon: '/vortex-cards/icon.svg',
    badge: '/vortex-cards/icon.svg',
    data: { url: payload.url || '/vortex-cards/' },
    tag: payload.tag || 'vortex-unit-notification'
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/vortex-cards/', self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    for (const client of clients) {
      if (client.url.startsWith(self.location.origin) && 'focus' in client) {
        client.navigate(target);
        return client.focus();
      }
    }
    return self.clients.openWindow(target);
  }));
});
