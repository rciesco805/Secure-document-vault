const CACHE_VERSION = 'v5-ffbb4b61970f0c37';
const CACHE_NAME = `bf-fund-${CACHE_VERSION}`;
const STATIC_CACHE_NAME = `bf-fund-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `bf-fund-dynamic-${CACHE_VERSION}`;
const DOCUMENT_CACHE_PREFIX = 'bf-fund-documents-';

const STATIC_ASSETS = [
  '/offline',
  '/manifest.json',
  '/favicon.ico',
];

const API_CACHE_DURATION = 5 * 60 * 1000;
const DB_NAME = 'bf-fund-offline';
const DB_VERSION = 2;
const DOCS_STORE = 'offline-documents';

const ALLOWED_CACHE_ORIGINS = [
  self.location.origin,
  'https://dataroom.bermudafranchisegroup.com',
  'https://objectstorage.replit.app',
];

let currentUserId = null;

function getDocumentCacheName(userId = null) {
  const effectiveUserId = userId || currentUserId;
  return effectiveUserId 
    ? `${DOCUMENT_CACHE_PREFIX}user-${effectiveUserId}-${CACHE_VERSION}`
    : `${DOCUMENT_CACHE_PREFIX}anonymous-${CACHE_VERSION}`;
}

function isAllowedOrigin(url) {
  try {
    const urlObj = new URL(url);
    return ALLOWED_CACHE_ORIGINS.some(origin => 
      urlObj.origin === origin || urlObj.hostname.endsWith('.replit.app')
    );
  } catch {
    return false;
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(DOCS_STORE)) {
        const store = db.createObjectStore(DOCS_STORE, { keyPath: 'id' });
        store.createIndex('savedAt', 'savedAt', { unique: false });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('userId', 'userId', { unique: false });
      } else if (event.oldVersion < 2) {
        const tx = event.target.transaction;
        const store = tx.objectStore(DOCS_STORE);
        if (!store.indexNames.contains('userId')) {
          store.createIndex('userId', 'userId', { unique: false });
        }
      }
    };
  });
}

async function saveDocumentMetadata(doc) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DOCS_STORE, 'readwrite');
    const store = tx.objectStore(DOCS_STORE);
    const request = store.put({
      ...doc,
      savedAt: Date.now(),
    });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function getDocumentMetadata(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DOCS_STORE, 'readonly');
    const store = tx.objectStore(DOCS_STORE);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function getAllDocumentMetadata() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DOCS_STORE, 'readonly');
    const store = tx.objectStore(DOCS_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function deleteDocumentMetadata(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DOCS_STORE, 'readwrite');
    const store = tx.objectStore(DOCS_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function cacheDocument(docInfo) {
  const { id, name, type, url, thumbnailUrl, size, userId } = docInfo;
  
  if (!isAllowedOrigin(url)) {
    console.error('[SW] Blocked caching from untrusted origin:', url);
    return { success: false, error: 'Document origin not allowed' };
  }
  
  if (!userId) {
    console.error('[SW] Cannot cache document without user ID');
    return { success: false, error: 'User authentication required' };
  }
  
  currentUserId = userId;
  
  try {
    const cacheName = getDocumentCacheName(userId);
    const cache = await caches.open(cacheName);
    
    const docResponse = await fetch(url);
    if (docResponse.ok) {
      await cache.put(url, docResponse.clone());
    } else {
      return { success: false, error: 'Failed to fetch document' };
    }
    
    if (thumbnailUrl && isAllowedOrigin(thumbnailUrl)) {
      try {
        const thumbResponse = await fetch(thumbnailUrl);
        if (thumbResponse.ok) {
          await cache.put(thumbnailUrl, thumbResponse.clone());
        }
      } catch (e) {
        console.warn('[SW] Failed to cache thumbnail:', e);
      }
    }
    
    await saveDocumentMetadata({
      id,
      name,
      type: type || 'document',
      url,
      thumbnailUrl,
      size: size || 0,
      cached: true,
      userId,
      cacheName,
    });
    
    console.log('[SW] Document cached successfully:', name);
    return { success: true, id };
  } catch (error) {
    console.error('[SW] Failed to cache document:', error);
    return { success: false, error: error.message };
  }
}

async function clearUserDocumentCache(userId) {
  try {
    const cacheNames = await caches.keys();
    const userCaches = cacheNames.filter(name => 
      name.startsWith(DOCUMENT_CACHE_PREFIX) && name.includes(`user-${userId}`)
    );
    
    await Promise.all(userCaches.map(name => caches.delete(name)));
    
    const db = await openDB();
    const tx = db.transaction(DOCS_STORE, 'readwrite');
    const store = tx.objectStore(DOCS_STORE);
    const index = store.index('userId');
    const request = index.openCursor(IDBKeyRange.only(userId));
    
    await new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
    
    db.close();
    console.log('[SW] Cleared document cache for user:', userId);
    return { success: true };
  } catch (error) {
    console.error('[SW] Failed to clear user cache:', error);
    return { success: false, error: error.message };
  }
}

async function removeDocumentFromCache(id, url, userId) {
  try {
    if (userId) currentUserId = userId;
    const cacheName = getDocumentCacheName(userId);
    const cache = await caches.open(cacheName);
    if (url) {
      await cache.delete(url);
    }
    await deleteDocumentMetadata(id);
    console.log('[SW] Document removed from cache:', id);
    return { success: true };
  } catch (error) {
    console.error('[SW] Failed to remove document from cache:', error);
    return { success: false, error: error.message };
  }
}

async function getCacheStats(userId) {
  try {
    const allDocs = await getAllDocumentMetadata();
    const docs = userId ? allDocs.filter(doc => doc.userId === userId) : allDocs;
    
    let cacheEntries = 0;
    if (userId) {
      const cacheName = getDocumentCacheName(userId);
      const cacheExists = await caches.has(cacheName);
      if (cacheExists) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        cacheEntries = keys.length;
      }
    }
    
    let totalSize = 0;
    for (const doc of docs) {
      totalSize += doc.size || 0;
    }
    
    return {
      documentCount: docs.length,
      cacheEntries,
      estimatedSize: totalSize,
      documents: docs,
    };
  } catch (error) {
    console.error('[SW] Failed to get cache stats:', error);
    return { documentCount: 0, cacheEntries: 0, estimatedSize: 0, documents: [] };
  }
}

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
                   !name.includes(CACHE_VERSION) &&
                   !name.startsWith('bf-fund-documents-');
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

self.addEventListener('message', async (event) => {
  const { type, payload } = event.data || {};
  
  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  
  if (type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => caches.delete(name))
        );
      }).then(() => {
        console.log('[SW] All caches cleared');
      })
    );
    return;
  }
  
  if (type === 'SET_USER_ID') {
    currentUserId = payload.userId;
    console.log('[SW] User ID set:', currentUserId);
    event.ports[0]?.postMessage({ success: true });
    return;
  }
  
  if (type === 'USER_LOGOUT') {
    const userId = payload?.userId || currentUserId;
    if (userId) {
      const result = await clearUserDocumentCache(userId);
      currentUserId = null;
      event.ports[0]?.postMessage(result);
    } else {
      event.ports[0]?.postMessage({ success: true, message: 'No user cache to clear' });
    }
    return;
  }
  
  if (type === 'CACHE_DOCUMENT') {
    const result = await cacheDocument(payload);
    event.ports[0]?.postMessage(result);
    return;
  }
  
  if (type === 'REMOVE_CACHED_DOCUMENT') {
    const result = await removeDocumentFromCache(payload.id, payload.url, payload.userId);
    event.ports[0]?.postMessage(result);
    return;
  }
  
  if (type === 'GET_CACHED_DOCUMENTS') {
    const userId = payload?.userId || currentUserId;
    if (userId) {
      currentUserId = userId;
    }
    const docs = await getAllDocumentMetadata();
    const filteredDocs = userId ? docs.filter(d => d.userId === userId) : docs;
    event.ports[0]?.postMessage({ documents: filteredDocs });
    return;
  }
  
  if (type === 'GET_CACHE_STATS') {
    const userId = payload?.userId || currentUserId;
    const stats = await getCacheStats(userId);
    event.ports[0]?.postMessage(stats);
    return;
  }
  
  if (type === 'CHECK_DOCUMENT_CACHED') {
    const doc = await getDocumentMetadata(payload.id);
    const checkUserId = payload.userId || currentUserId;
    const isValid = doc && checkUserId && doc.userId === checkUserId;
    event.ports[0]?.postMessage({ cached: !!isValid, document: isValid ? doc : null });
    return;
  }
  
  if (type === 'CLEAR_DOCUMENT_CACHE') {
    const userId = payload?.userId || currentUserId;
    if (userId) {
      const result = await clearUserDocumentCache(userId);
      event.ports[0]?.postMessage(result);
    } else {
      try {
        const cacheNames = await caches.keys();
        const docCaches = cacheNames.filter(name => name.startsWith(DOCUMENT_CACHE_PREFIX));
        await Promise.all(docCaches.map(name => caches.delete(name)));
        
        const db = await openDB();
        const tx = db.transaction(DOCS_STORE, 'readwrite');
        const store = tx.objectStore(DOCS_STORE);
        await new Promise((resolve, reject) => {
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
        db.close();
        event.ports[0]?.postMessage({ success: true });
      } catch (error) {
        event.ports[0]?.postMessage({ success: false, error: error.message });
      }
    }
    return;
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  if (url.pathname.match(/\.(pdf)$/i) || 
      url.pathname.includes('/api/files/') || 
      url.pathname.includes('/api/documents/') && url.pathname.includes('/download')) {
    event.respondWith(
      (async () => {
        const cacheName = currentUserId ? getDocumentCacheName(currentUserId) : null;
        
        if (cacheName) {
          try {
            const cache = await caches.open(cacheName);
            const cachedResponse = await cache.match(request);
            if (cachedResponse) {
              console.log('[SW] Serving cached document for user:', currentUserId, url.pathname);
              return cachedResponse;
            }
          } catch (error) {
            console.error('[SW] Cache lookup failed:', error);
          }
        }
        
        try {
          const networkResponse = await fetch(request);
          return networkResponse;
        } catch (error) {
          console.error('[SW] Document fetch failed:', error);
          return new Response(
            JSON.stringify({ error: 'Document not available offline' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        }
      })()
    );
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
      (async () => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          return new Response('', { status: 404 });
        }
      })()
    );
    return;
  }

  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/)) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          return new Response('', { status: 404 });
        }
      })()
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
                a { color: #059669; text-decoration: none; display: block; margin-top: 16px; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>You're Offline</h1>
                <p>Please check your internet connection and try again.</p>
                <a href="/lp/offline-documents">View Saved Documents</a>
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
