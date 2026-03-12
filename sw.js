// ClinBridge Service Worker — v9.9.20
const CACHE_NAME = 'clinbridge-v9.9.20';
const CORE_FILES = [
  './ClinBridgev9_9_20.html',
  './index.html',
  './manifest.json'
];
self.addEventListener('install', function(event) {
  event.waitUntil(caches.open(CACHE_NAME).then(function(cache) { return cache.addAll(CORE_FILES); }));
  self.skipWaiting();
});
self.addEventListener('activate', function(event) {
  event.waitUntil(caches.keys().then(function(keys) {
    return Promise.all(keys.filter(function(k) { return k !== CACHE_NAME; }).map(function(k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;
  event.respondWith(fetch(event.request).then(function(response) {
    if (response && response.status === 200) {
      var clone = response.clone();
      caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
    }
    return response;
  }).catch(function() { return caches.match(event.request); }));
});
self.addEventListener('push', function(event) {
  var data = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(data.title || 'ClinBridge', {
    body: data.body || 'Time for your scheduled event.',
    icon: data.icon || './ClinBridge-App-logo.JPG',
    badge: data.badge || './ClinBridge-App-logo.JPG',
    tag: data.tag || 'clinbridge-reminder',
    data: data.data || {}
  }));
});
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].url.includes('ClinBridge') && 'focus' in list[i]) return list[i].focus();
    }
    return clients.openWindow('./ClinBridgev9_9_20.html');
  }));
});
