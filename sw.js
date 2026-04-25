// ClinBridge Service Worker
// CACHE_NAME must be updated every release — it forces all clients to re-fetch
// the new HTML on activate, so users never run a stale version silently.
const CACHE_NAME = 'clinbridge-v9.10.88';

const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// ── Install: pre-cache shell assets ─────────────────────────────────────────
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  // Activate immediately — don't wait for old tabs to close
  self.skipWaiting();
});

// ── Activate: delete all old caches ─────────────────────────────────────────
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(key) { return key !== CACHE_NAME; })
          .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      // Take control of all open clients immediately
      return self.clients.claim();
    })
  );
});

// ── Fetch: cache-first for shell, network-first for version.json ─────────────
self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // Always fetch version.json fresh — it drives the update-available banner
  if (url.includes('version.json')) {
    event.respondWith(
      fetch(event.request).catch(function() {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Cache-first for everything else (app shell, manifest)
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      return cached || fetch(event.request).then(function(response) {
        // Don't cache opaque cross-origin responses
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
        return response;
      });
    })
  );
});
