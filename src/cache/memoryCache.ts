import type { Cache, CacheEntry, MemoryCacheOptions } from './cacheTypes';

/**
 * Creates a Map-based in-memory cache with TTL support.
 *
 * - Entries expire after their TTL and are lazily cleaned on access.
 * - No persistence; cache resets on process restart.
 * - Deterministic: expiration is based on Date.now() comparison.
 */
export function createMemoryCache(options: MemoryCacheOptions = {}): Cache {
  const store = new Map<string, CacheEntry<unknown>>();
  const { defaultTtlMs } = options;

  function isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() >= entry.expiresAt;
  }

  function getStats(): { size: number; keys: string[] } {
    return { size: store.size, keys: Array.from(store.keys()) };
  }

  return {
    get<T>(key: string): T | null {
      const entry = store.get(key);
      const stats = getStats();

      if (!entry) {
        console.log(`[cache] MISS key="${key}" (store size: ${stats.size}, keys: [${stats.keys.join(', ')}])`);
        return null;
      }

      if (isExpired(entry)) {
        store.delete(key);
        console.log(`[cache] EXPIRED key="${key}" (store size: ${stats.size - 1})`);
        return null;
      }

      const remainingTtl = entry.expiresAt - Date.now();
      console.log(`[cache] HIT key="${key}" (expires in ${remainingTtl}ms, store size: ${stats.size})`);
      return entry.value as T;
    },

    set<T>(key: string, value: T, ttlMs?: number): void {
      const ttl = ttlMs ?? defaultTtlMs;

      if (ttl === undefined || ttl <= 0) {
        throw new Error(
          `Invalid TTL for cache key "${key}": ttlMs must be a positive number`
        );
      }

      const entry: CacheEntry<T> = {
        value,
        expiresAt: Date.now() + ttl,
      };

      store.set(key, entry);
      console.log(`[cache] SET key="${key}" ttl=${ttl}ms (store size: ${store.size})`);
    },

    delete(key: string): void {
      const existed = store.has(key);
      store.delete(key);
      console.log(`[cache] DELETE key="${key}" existed=${existed} (store size: ${store.size})`);
    },

    clear(): void {
      const prevSize = store.size;
      store.clear();
      console.log(`[cache] CLEAR removed ${prevSize} entries`);
    },
  };
}

