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

  return {
    get<T>(key: string): T | null {
      const entry = store.get(key);

      if (!entry) {
        return null;
      }

      if (isExpired(entry)) {
        store.delete(key);
        return null;
      }

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
    },

    delete(key: string): void {
      store.delete(key);
    },

    clear(): void {
      store.clear();
    },
  };
}

