// ClinBridge Service Worker — v9.9.23
// Scope: push notification infrastructure groundwork.
// No aggressive caching — GitHub Pages handles delivery.

const CACHE_NAME = 'clinbridge-v9.9.23';

// Install: activate immediately
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

// Activate: claim all clients right away
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch: network-first, no caching (keep GitHub Pages as source of truth)
self.addEventListener('fetch', function(event) {
  // Let the browser handle all fetches normally
});

// Push: receive server-sent push notifications (future implementation)
self.addEventListener('push', function(event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch(e) {}

  var title   = data.title   || 'ClinBridge';
  var options = {
    body:    data.body    || 'Tap to open ClinBridge.',
    icon:    data.icon    || 'https://sommerstexan-lgtm.github.io/ClinBridge/ClinBridge-App-logo.JPG',
    badge:   data.badge   || 'https://sommerstexan-lgtm.github.io/ClinBridge/ClinBridge-App-logo.JPG',
    tag:     data.tag     || 'clinbridge-default',
    data:    data.data    || { url: self.location.origin }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click: focus or open the app
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var targetUrl = (event.notification.data && event.notification.data.url)
                  ? event.notification.data.url
                  : self.location.origin;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url === targetUrl && 'focus' in list[i]) {
          return list[i].focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
