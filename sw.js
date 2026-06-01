const CACHE_NAME = 'clinbridge-v9.10.161';
const urlsToCache = ['./', './index.html', './manifest.json', './ClinBridge-App-logo.JPG'];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Network-first: always try network, fall back to cache
  // This ensures fresh content on every load
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache the fresh response
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
