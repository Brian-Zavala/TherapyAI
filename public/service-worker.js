/**
 * Service Worker for Push Notifications
 * Implements 2025 best practices for Next.js 15
 */

// Cache name for versioning
const CACHE_NAME = 'therapy-app-v1';
const urlsToCache = [
  '/',
  '/offline',
  '/sounds/notification.mp3',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  // Force immediate activation
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API requests
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response
        const responseToCache = response.clone();

        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache);
          });

        return response;
      })
      .catch(() => {
        return caches.match(event.request)
          .then((response) => {
            if (response) {
              return response;
            }
            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/offline');
            }
          });
      })
  );
});

// Push event - handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  let data = {
    title: 'Therapy Session Reminder',
    body: 'You have an upcoming session',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    tag: 'therapy-reminder',
    requireInteraction: false
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      console.error('Failed to parse push data:', e);
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    requireInteraction: data.requireInteraction,
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.id || 1,
      url: data.url || '/'
    },
    actions: [
      {
        action: 'view',
        title: 'View Session',
        icon: '/icons/view.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received:', event);

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const url = event.notification.data.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there is already a window/tab open with the target URL
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, open a new window/tab
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Background sync event - sync data when connection is restored
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event);

  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

// Sync notifications with server
async function syncNotifications() {
  try {
    const response = await fetch('/api/notifications/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Sync failed');
    }

    console.log('Notifications synced successfully');
  } catch (error) {
    console.error('Failed to sync notifications:', error);
    throw error;
  }
}

// Message event - communicate with the app
self.addEventListener('message', (event) => {
  console.log('Service worker received message:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CHECK_NOTIFICATIONS') {
    // Check for new notifications
    checkForNotifications();
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-notifications') {
    event.waitUntil(checkForNotifications());
  }
});

// Check for new notifications
async function checkForNotifications() {
  try {
    const response = await fetch('/api/notifications?unreadOnly=true&limit=5');
    if (!response.ok) return;

    const data = await response.json();
    const unreadCount = data.summary?.unreadCount || 0;

    if (unreadCount > 0) {
      // Update badge
      if ('setAppBadge' in navigator) {
        navigator.setAppBadge(unreadCount);
      }

      // Show notification for urgent items
      const urgentNotifications = data.notifications.filter(
        n => n.priority === 'urgent' && !n.readAt
      );

      for (const notification of urgentNotifications) {
        await self.registration.showNotification(notification.title, {
          body: notification.message,
          icon: '/icon-192x192.png',
          badge: '/icon-72x72.png',
          tag: notification.id,
          requireInteraction: true,
          data: {
            url: `/sessions/${notification.sessionId || ''}`
          }
        });
      }
    }
  } catch (error) {
    console.error('Failed to check notifications:', error);
  }
}