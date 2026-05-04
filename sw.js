// ClinBridge Service Worker — v9.10.91
const CACHE_NAME = 'clinbridge-v9.10.91';
const FILES_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[ClinBridge SW] Deleting old cache:', key);
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evt) => {
  // Only handle GET requests
  if (evt.request.method !== 'GET') return;
  // Skip cross-origin requests
  if (!evt.request.url.startsWith(self.location.origin)) return;

  evt.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(evt.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(evt.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(evt.request, networkResponse.clone());
          }
          return networkResponse;
        });
      });
    })
  );
});

// Push notification support
self.addEventListener('push', function(event) {
  if (!event.data) return;
  var data = event.data.json();
  var title = data.title || 'ClinBridge';
  var options = {
    body: data.body || '',
    tag: data.tag || 'clinbridge-notif',
    icon: data.icon || './icon-192.png',
    badge: data.badge || './icon-192.png',
    requireInteraction: false
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        if (clientList[i].url && 'focus' in clientList[i]) {
          return clientList[i].focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('./');
      }
    })
  );
});
