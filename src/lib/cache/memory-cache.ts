/**
 * Tiny in-memory TTL cache with request coalescing.
 *
 * Lives in the Node.js process. Survives between requests on the same server,
 * resets on deploy/restart. Perfect for expensive read-heavy computations
 * like per-listing CMA generation that don't change minute-to-minute.
 */

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const stores = new Map<string, Map<string, Entry<any>>>();
const inflight = new Map<string, Promise<any>>();

function getStore(namespace: string): Map<string, Entry<any>> {
  let store = stores.get(namespace);
  if (!store) {
    store = new Map();
    stores.set(namespace, store);
  }
  return store;
}

export function cacheGet<T>(namespace: string, key: string): T | null {
  const store = getStore(namespace);
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function cacheSet<T>(
  namespace: string,
  key: string,
  value: T,
  ttlSeconds: number
): void {
  const store = getStore(namespace);
  store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

/**
 * Cache-aside helper. Concurrent callers for the same key share a single
 * in-flight promise so we don't stampede the database on cache miss.
 *
 * Errors and `{error: ...}` sentinels are NOT cached — those re-run on the
 * next call so transient failures don't get pinned for the full TTL.
 */
export async function cached<T>(
  namespace: string,
  key: string,
  ttlSeconds: number,
  producer: () => Promise<T>
): Promise<T> {
  const hit = cacheGet<T>(namespace, key);
  if (hit !== null) return hit;

  const flightKey = `${namespace}:${key}`;
  const existing = inflight.get(flightKey);
  if (existing) return existing as Promise<T>;

  const promise = (async () => {
    try {
      const value = await producer();
      const isError =
        value &&
        typeof value === "object" &&
        "error" in (value as any) &&
        (value as any).error;
      if (!isError) cacheSet(namespace, key, value, ttlSeconds);
      return value;
    } finally {
      inflight.delete(flightKey);
    }
  })();

  inflight.set(flightKey, promise);
  return promise;
}
