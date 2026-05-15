// ClinBridge Service Worker — v9.10.133
const CACHE_NAME = 'clinbridge-v9.10.133';
const urlsToCache = [
  './',
  './index.html',
  './ClinBridgev9_10_133.html',
  './manifest.json',
  './ClinBridge-App-logo.JPG'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(urlsToCache)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
  )));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
    if (!res || res.status !== 200 || res.type !== 'basic') return res;
    const clone = res.clone();
    caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
    return res;
  })));
});
