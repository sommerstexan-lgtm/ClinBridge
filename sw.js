// ClinBridge Service Worker — v9.9.3
// Handles OS push notifications and app open on notification click.
// Deploy this file alongside ClinBridgev9_9_2.html (or index.html) on GitHub Pages.

var CACHE_NAME = 'clinbridge-v9.9.3';

// ── Install ──────────────────────────────────────────────────────────────
self.addEventListener('install', function(event) {
  console.log('[SW] Installed ClinBridge SW v9.9.3');
  self.skipWaiting(); // Activate immediately — no waiting for old SW to exit
});

// ── Activate ─────────────────────────────────────────────────────────────
self.addEventListener('activate', function(event) {
  console.log('[SW] Activated ClinBridge SW v9.9.3');
  event.waitUntil(
    clients.claim() // Take control of all open pages immediately
  );
});

// ── Fetch — pass-through (no caching for app HTML to ensure freshest version)
self.addEventListener('fetch', function(event) {
  // Let the browser handle all fetches normally.
  // ClinBridge intentionally does NOT cache the app HTML so updates
  // from GitHub Pages are always picked up on next load.
  return;
});

// ── Notification Click ────────────────────────────────────────────────────
// When user taps a notification banner, open or focus ClinBridge
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  var targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : self.registration.scope;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(windowClients) {
        // If ClinBridge is already open, focus it
        for (var i = 0; i < windowClients.length; i++) {
          var client = windowClients[i];
          if (client.url.indexOf(self.registration.scope) === 0 && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// ── Push (future: server-sent push) ──────────────────────────────────────
// Not currently used — ClinBridge schedules notifications client-side via setTimeout.
// This handler is here for future server push integration.
self.addEventListener('push', function(event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch(e) {}

  var title = data.title || '🔔 ClinBridge';
  var options = {
    body:  data.body || 'You have an event reminder.',
    icon:  'clinbridge-logo.png',
    badge: 'clinbridge-logo.png',
    tag:   data.tag  || 'clinbridge-push',
    requireInteraction: true,
    data:  data
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});
