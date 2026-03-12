// ClinBridge Service Worker — v9.9.16
var CACHE_NAME = 'clinbridge-v9-9-16';
var APP_FILE   = 'ClinBridgev9_9_16.html';

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(['./', APP_FILE, 'manifest.json']);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k)   { return caches.delete(k);  })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request);
    })
  );
});

// Push notification handler (groundwork for future server-push)
self.addEventListener('push', function(e) {
  var data = e.data ? e.data.json() : { title: 'ClinBridge', body: 'You have a reminder.' };
  e.waitUntil(
    self.registration.showNotification(data.title || 'ClinBridge', {
      body:  data.body  || '',
      icon:  data.icon  || './manifest.json',
      badge: data.badge || ''
    })
  );
});
