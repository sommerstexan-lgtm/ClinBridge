// ClinBridge Service Worker — v9.10.93
const CACHE_NAME = 'clinbridge-v9.10.93';
const FILES_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then((keyList) => Promise.all(
      keyList.map((key) => { if (key !== CACHE_NAME) return caches.delete(key); })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evt) => {
  if (evt.request.method !== 'GET') return;
  if (!evt.request.url.startsWith(self.location.origin)) return;
  evt.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(evt.request).then((cached) => {
        if (cached) return cached;
        return fetch(evt.request).then((resp) => {
          if (resp && resp.status === 200) cache.put(evt.request, resp.clone());
          return resp;
        });
      })
    )
  );
});

self.addEventListener('push', function(event) {
  if (!event.data) return;
  var data = event.data.json();
  event.waitUntil(self.registration.showNotification(data.title || 'ClinBridge', {
    body: data.body || '', tag: data.tag || 'clinbridge-notif',
    icon: './icon-192.png', badge: './icon-192.png'
  }));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url && 'focus' in list[i]) return list[i].focus();
      }
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});
