/**
 * Custom service-worker code bundled into the production service worker.
 *
 * next-pwa (configured in next.config.mjs with dest:"public") generates the
 * production service worker with Workbox and AUTOMATICALLY imports this file
 * (`worker/index.{js,ts}`) into it. Without this, the generated SW would only
 * do runtime caching and the push-notification handlers — which previously
 * lived only in the hand-written, gitignored, dev-only `public/sw.js` — would
 * be missing in production, silently breaking SMS push notifications.
 *
 * Keep this file to the custom event handlers only. Lifecycle/caching
 * (install/activate/skipWaiting/clientsClaim/precaching) is owned by Workbox
 * via the next-pwa config; do not duplicate it here.
 */

// Push event — receive a push notification.
self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'New SMS Message',
    body: 'You have a new message',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'sms-notification',
    requireInteraction: false,
    data: { url: '/agent/messages' },
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        title: payload.title || 'New SMS Message',
        body: payload.body || 'You have a new message',
        icon: payload.icon || '/icons/icon-192x192.png',
        badge: payload.badge || '/icons/icon-72x72.png',
        tag: payload.tag || `sms-${payload.messageId || Date.now()}`,
        requireInteraction: payload.requireInteraction || false,
        data: {
          url: payload.url || `/agent/messages?phone=${payload.phoneNumber}`,
          phoneNumber: payload.phoneNumber,
          messageId: payload.messageId,
          contactName: payload.contactName,
        },
        actions: payload.actions || [
          { action: 'view', title: 'View' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
        vibrate: [200, 100, 200],
        timestamp: payload.timestamp || Date.now(),
      };
    } catch (error) {
      console.error('[Service Worker] Error parsing push payload:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click — focus an existing window or open a new one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/agent/messages';

  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          for (const client of clientList) {
            if (client.url.includes('/agent/messages') && 'focus' in client) {
              if (event.notification.data?.phoneNumber) {
                client.postMessage({
                  type: 'OPEN_CONVERSATION',
                  phoneNumber: event.notification.data.phoneNumber,
                });
              }
              return client.focus();
            }
          }
          if (self.clients.openWindow) {
            return self.clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

// Message relay (e.g. GET_VERSION). SKIP_WAITING is handled by next-pwa.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: 'next-pwa' });
  }
});

// Background sync — flush unsynced SMS when connectivity returns.
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(
      fetch('/api/crm/sms/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).catch((error) => {
        console.error('[Service Worker] Sync failed:', error);
      })
    );
  }
});
