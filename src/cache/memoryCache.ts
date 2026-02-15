import type { Cache, CacheEntry, MemoryCacheOptions, CacheStats } from './cacheTypes';

/**
 * Creates a Map-based in-memory cache with TTL support and LRU eviction.
 *
 * - Entries expire after their TTL and are lazily cleaned on access.
 * - LRU eviction when maxSize is reached (removes least recently used entry).
 * - No persistence; cache resets on process restart.
 * - Deterministic: expiration is based on Date.now() comparison.
 */
export function createMemoryCache(options: MemoryCacheOptions = {}): Cache {
  const store = new Map<string, CacheEntry<unknown>>();
  const accessTimes = new Map<string, number>(); // Track last access time for LRU
  const { defaultTtlMs, maxSize } = options;

  // Track hit/miss for metrics
  let hits = 0;
  let misses = 0;

  function isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() >= entry.expiresAt;
  }

  /**
   * Evicts the least recently used entry when cache is at capacity.
   * Only called when maxSize is defined and cache is at limit.
   */
  function evictLRU(): void {
    if (!maxSize || store.size < maxSize) {
      return;
    }

    // Find the entry with the oldest access time
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, accessTime] of accessTimes.entries()) {
      if (accessTime < oldestTime) {
        oldestTime = accessTime;
        oldestKey = key;
      }
    }

    // Evict the oldest entry
    if (oldestKey) {
      store.delete(oldestKey);
      accessTimes.delete(oldestKey);
      console.log(`[cache] LRU eviction: removed "${oldestKey}" (store size: ${store.size})`);
    }
  }

  return {
    get<T>(key: string): T | null {
      const entry = store.get(key);

      if (!entry) {
        misses++;
        console.log(`[cache] MISS key="${key}" (store size: ${store.size})`);
        return null;
      }

      if (isExpired(entry)) {
        store.delete(key);
        accessTimes.delete(key);
        misses++;
        console.log(`[cache] EXPIRED key="${key}" (store size: ${store.size})`);
        return null;
      }

      // Update access time for LRU tracking
      accessTimes.set(key, Date.now());
      hits++;

      const remainingTtl = entry.expiresAt - Date.now();
      console.log(`[cache] HIT key="${key}" (expires in ${remainingTtl}ms, store size: ${store.size})`);
      return entry.value as T;
    },

    set<T>(key: string, value: T, ttlMs?: number): void {
      const ttl = ttlMs ?? defaultTtlMs;

      if (ttl === undefined || ttl <= 0) {
        throw new Error(
          `Invalid TTL for cache key "${key}": ttlMs must be a positive number`
        );
      }

      // Evict LRU entry if at capacity
      evictLRU();

      const entry: CacheEntry<T> = {
        value,
        expiresAt: Date.now() + ttl,
      };

      store.set(key, entry);
      accessTimes.set(key, Date.now());
      console.log(`[cache] SET key="${key}" ttl=${ttl}ms (store size: ${store.size})`);
    },

    delete(key: string): void {
      const existed = store.has(key);
      store.delete(key);
      accessTimes.delete(key);
      console.log(`[cache] DELETE key="${key}" existed=${existed} (store size: ${store.size})`);
    },

    clear(): void {
      const prevSize = store.size;
      store.clear();
      accessTimes.clear();
      hits = 0;
      misses = 0;
      console.log(`[cache] CLEAR removed ${prevSize} entries`);
    },

    getStats(): CacheStats {
      const totalRequests = hits + misses;
      return {
        size: store.size,
        maxSize,
        keys: Array.from(store.keys()),
        hitRate: totalRequests > 0 ? hits / totalRequests : 0,
      };
    },
  };
}

