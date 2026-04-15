// ClinBridge Service Worker
// CACHE_NAME must be updated every release — see VERSION UPDATE CHECKLIST item 8
const CACHE_NAME = 'clinbridge-v9.10.63';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './ClinBridge-App-logo.JPG'
];

// Install — cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — purge old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[ClinBridge SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// Fetch — cache-first for core assets, network-first for version.json
self.addEventListener('fetch', event => {
  // Always fetch version.json fresh (update check)
  if (event.request.url.includes('version.json')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        // Cache successful GET responses
        if (response && response.status === 200 && event.request.method === 'GET') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => caches.match('./index.html'))
  );
});

// Push notifications
self.addEventListener('push', event => {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch(e) {}
  var title = data.title || 'ClinBridge';
  var options = {
    body: data.body || 'You have a new reminder.',
    icon: './ClinBridge-App-logo.JPG',
    badge: './ClinBridge-App-logo.JPG',
    tag: data.tag || 'clinbridge-reminder',
    data: data
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (var c of list) {
        if (c.url && c.focus) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});
