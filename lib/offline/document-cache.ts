export interface CachedDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  thumbnailUrl?: string;
  size: number;
  savedAt: number;
  cached: boolean;
  userId?: string;
}

export interface CacheStats {
  documentCount: number;
  cacheEntries: number;
  estimatedSize: number;
  documents: CachedDocument[];
}

let abortController: AbortController | null = null;

async function waitForServiceWorker(): Promise<ServiceWorker> {
  if (navigator.serviceWorker.controller) {
    return navigator.serviceWorker.controller;
  }
  
  await navigator.serviceWorker.ready;
  
  if (navigator.serviceWorker.controller) {
    return navigator.serviceWorker.controller;
  }
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Service worker not available'));
    }, 5000);
    
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      clearTimeout(timeout);
      if (navigator.serviceWorker.controller) {
        resolve(navigator.serviceWorker.controller);
      }
    });
  });
}

function sendSWMessage<T>(type: string, payload?: any): Promise<T> {
  return new Promise(async (resolve, reject) => {
    try {
      const sw = await waitForServiceWorker();
      
      abortController?.abort();
      abortController = new AbortController();
      
      const messageChannel = new MessageChannel();
      
      const timeoutId = setTimeout(() => {
        abortController?.abort();
        reject(new Error('Service worker message timeout'));
      }, 30000);
      
      messageChannel.port1.onmessage = (event) => {
        clearTimeout(timeoutId);
        resolve(event.data);
      };
      
      sw.postMessage({ type, payload }, [messageChannel.port2]);
    } catch (error) {
      reject(error);
    }
  });
}

export async function setUserIdForCache(userId: string): Promise<void> {
  try {
    await sendSWMessage('SET_USER_ID', { userId });
  } catch (error) {
    console.error('Failed to set user ID for cache:', error);
  }
}

export async function clearCacheOnLogout(userId?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await sendSWMessage<{ success: boolean; error?: string }>(
      'USER_LOGOUT',
      { userId }
    );
    return result;
  } catch (error) {
    console.error('Failed to clear cache on logout:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function cacheDocumentForOffline(
  doc: {
    id: string;
    name: string;
    type?: string;
    url: string;
    thumbnailUrl?: string;
    size?: number;
  },
  userId: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!userId) {
    return { success: false, error: 'User authentication required' };
  }
  
  try {
    const result = await sendSWMessage<{ success: boolean; id?: string; error?: string }>(
      'CACHE_DOCUMENT',
      { ...doc, userId }
    );
    return result;
  } catch (error) {
    console.error('Failed to cache document:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function removeCachedDocument(
  id: string,
  url?: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await sendSWMessage<{ success: boolean; error?: string }>(
      'REMOVE_CACHED_DOCUMENT',
      { id, url, userId }
    );
    return result;
  } catch (error) {
    console.error('Failed to remove cached document:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function getCachedDocuments(userId?: string): Promise<CachedDocument[]> {
  try {
    const result = await sendSWMessage<{ documents: CachedDocument[] }>(
      'GET_CACHED_DOCUMENTS',
      { userId }
    );
    return result.documents || [];
  } catch (error) {
    console.error('Failed to get cached documents:', error);
    return [];
  }
}

export async function getCacheStats(userId?: string): Promise<CacheStats> {
  try {
    const result = await sendSWMessage<CacheStats>('GET_CACHE_STATS', { userId });
    return result;
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return { documentCount: 0, cacheEntries: 0, estimatedSize: 0, documents: [] };
  }
}

export async function isDocumentCached(id: string, userId?: string): Promise<boolean> {
  try {
    const result = await sendSWMessage<{ cached: boolean }>(
      'CHECK_DOCUMENT_CACHED',
      { id, userId }
    );
    return result.cached;
  } catch (error) {
    console.error('Failed to check document cache status:', error);
    return false;
  }
}

export async function clearDocumentCache(userId?: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (userId) {
      return await clearCacheOnLogout(userId);
    }
    const result = await sendSWMessage<{ success: boolean; error?: string }>(
      'CLEAR_DOCUMENT_CACHE'
    );
    return result;
  } catch (error) {
    console.error('Failed to clear document cache:', error);
    return { success: false, error: (error as Error).message };
  }
}

export function formatCacheSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function isOfflineCacheSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'caches' in window &&
    'indexedDB' in window
  );
}
