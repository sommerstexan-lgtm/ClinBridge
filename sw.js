// ClinBridge Service Worker — v9.9.9
// Handles notification display and click routing for iOS PWA and Android PWA.
// Notifications are scheduled and fired from the main thread via
// registration.showNotification() — this SW receives the notificationclick event
// and focuses or opens the app window in response.

var CACHE_NAME = 'clinbridge-sw-v1';

// ── Lifecycle ────────────────────────────────────────────────────────────────

self.addEventListener('install', function(event) {
  // Take control immediately — don't wait for old SW to become idle
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  // Claim all open clients so this SW controls them right away
  event.waitUntil(self.clients.claim());
});

// ── Notification Click ───────────────────────────────────────────────────────

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  var targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : self.registration.scope;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // If ClinBridge is already open, focus it
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if (client.url === targetUrl && 'focus' in client) {
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

// ── Push Event (future-proofing) ─────────────────────────────────────────────
// ClinBridge currently uses scheduled setTimeout-based notifications fired from
// the main thread via registration.showNotification(). This handler is a no-op
// placeholder for a future server-push implementation.
self.addEventListener('push', function(event) {
  if (!event.data) return;
  try {
    var payload = event.data.json();
    event.waitUntil(
      self.registration.showNotification(payload.title || 'ClinBridge', {
        body:  payload.body  || '',
        tag:   payload.tag   || 'clinbridge-push',
        icon:  'clinbridge-logo.png',
        badge: 'clinbridge-logo.png',
        data:  { url: self.registration.scope }
      })
    );
  } catch(e) {
    console.warn('[ClinBridge SW] Push parse error:', e);
  }
});
