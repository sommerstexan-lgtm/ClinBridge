// ClinBridge Service Worker v9.10.36
// Handles push notifications and caching for PWA home screen installs.

const CACHE_NAME = 'clinbridge-v9.10.40';
const URLS_TO_CACHE = [
  './',
  './index.html'
];

// Install — cache core files
self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

// Activate — remove old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) {
          return key !== CACHE_NAME;
        }).map(function(key) {
          return caches.delete(key);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch — network first, cache fallback for offline
self.addEventListener('fetch', function(event) {
  // Only handle GET requests for same-origin resources
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request).then(function(response) {
      // Cache a copy of successful responses
      if (response && response.status === 200) {
        var responseClone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseClone);
        });
      }
      return response;
    }).catch(function() {
      // Network failed — serve from cache
      return caches.match(event.request);
    })
  );
});

// Push notifications
self.addEventListener('push', function(event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch(e) {}
  var title = data.title || '🔔 ClinBridge';
  var options = {
    body:    data.body    || 'You have a scheduled event.',
    icon:    data.icon    || './icon-192.png',
    badge:   data.badge   || './icon-192.png',
    tag:     data.tag     || 'clinbridge-notification',
    requireInteraction: false
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click — focus or open the app
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url.indexOf('clinbridge') !== -1 && 'focus' in list[i]) {
          return list[i].focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('https://clinbridge.clinic');
      }
    })
  );
});
