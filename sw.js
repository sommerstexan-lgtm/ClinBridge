const CACHE_NAME = 'clinbridge-v9.10.97';
const ASSETS = ['./', './index.html', './manifest.json'];
self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE_NAME).then(function(c) { return c.addAll(ASSETS); }));
  self.skipWaiting();
});
self.addEventListener('activate', function(e) {
  e.waitUntil(caches.keys().then(function(keys) {
    return Promise.all(keys.filter(function(k) { return k !== CACHE_NAME; }).map(function(k) { return caches.delete(k); }));
  }).then(function() { return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e) {
  var url = e.request.url;
  if (url.includes('version.json')) {
    e.respondWith(fetch(e.request).catch(function() { return caches.match(e.request); })); return;
  }
  e.respondWith(caches.match(e.request).then(function(cached) {
    return cached || fetch(e.request).then(function(r) {
      if (!r || r.status !== 200 || r.type === 'opaque') return r;
      var c = r.clone();
      caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, c); });
      return r;
    });
  }));
});
