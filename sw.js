// ClinBridge Service Worker v9.10.0
// Cache name MUST be bumped on every release
const CACHE_NAME = 'clinbridge-v9-10-0';

const PRECACHE_URLS = [
  './',
  './index.html',
  './ClinBridgev9_10_0.html',
  './manifest.json'
];

// Install: cache core files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate: delete old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for HTML (always get latest), cache-first for assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always go network-first for the main HTML and version.json
  if (url.pathname.endsWith('.html') || url.pathname.endsWith('version.json')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for everything else
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  );
});

// Push notifications (future server-side implementation)
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'ClinBridge', {
      body: data.body || '',
      icon: 'clinbridge-logo.png',
      badge: 'clinbridge-logo.png',
      tag: data.tag || 'clinbridge-alert',
      data: data
    })
  );
});

// Notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      for (const client of list) {
        if (client.url.includes('clinbridge') && 'focus' in client)
          return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('./ClinBridgev9_10_0.html');
    })
  );
});
