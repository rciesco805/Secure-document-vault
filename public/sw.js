const CACHE_VERSION = 'v2-2026-01-25';
const CACHE_NAME = `bf-fund-${CACHE_VERSION}`;
const STATIC_CACHE_NAME = `bf-fund-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `bf-fund-dynamic-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/favicon.ico',
];

const API_CACHE_DURATION = 5 * 60 * 1000;

self.addEventListener('install', (event) => {
  console.log('[SW] Installing new version:', CACHE_VERSION);
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((error) => {
        console.warn('[SW] Failed to cache some static assets:', error);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating new version:', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return name.startsWith('bf-fund-') && 
                   !name.includes(CACHE_VERSION);
          })
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Old caches cleared, claiming clients');
      return self.clients.claim();
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => caches.delete(name))
        );
      }).then(() => {
        console.log('[SW] All caches cleared');
      })
    );
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    if (request.headers.get('Authorization') || 
        url.pathname.includes('/sign/') ||
        url.pathname.includes('/transactions') ||
        url.pathname.includes('/lp/') ||
        url.pathname.includes('/admin/')) {
      return;
    }

    event.respondWith(
      fetch(request).catch(async (error) => {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        return new Response(
          JSON.stringify({ error: 'Offline', message: 'This data is not available offline' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  if (url.pathname.match(/\/_next\/static\//)) {
    event.respondWith(
      caches.open(STATIC_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          return new Response('', { status: 404 });
        }
      })
    );
    return;
  }

  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/)) {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(STATIC_CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      }).catch(async () => {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        return new Response('', { status: 404 });
      })
    );
    return;
  }

  event.respondWith(
    fetch(request).then((response) => {
      return response;
    }).catch(async () => {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      
      if (request.headers.get('Accept')?.includes('text/html')) {
        const offlinePage = await caches.match('/offline');
        if (offlinePage) {
          return offlinePage;
        }
        return new Response(
          `<!DOCTYPE html>
          <html>
            <head>
              <title>Offline - BF Fund</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0f172a; color: white; }
                .container { text-align: center; padding: 2rem; }
                h1 { color: #059669; }
                p { color: #94a3b8; }
                button { background: #059669; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px; margin-top: 16px; }
                button:hover { background: #047857; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>You're Offline</h1>
                <p>Please check your internet connection and try again.</p>
                <button onclick="location.reload()">Retry</button>
              </div>
            </body>
          </html>`,
          { headers: { 'Content-Type': 'text/html' } }
        );
      }
      
      return new Response('Offline', { status: 503 });
    })
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'You have a new notification',
      icon: '/_icons/icon-192x192.png',
      badge: '/_icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/',
      },
      actions: data.actions || [],
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'BF Fund', options)
    );
  } catch (error) {
    console.error('[SW] Push notification error:', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-actions') {
    event.waitUntil(syncPendingActions());
  }
});

async function syncPendingActions() {
  console.log('[SW] Background sync triggered');
}
