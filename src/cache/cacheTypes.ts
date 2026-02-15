/**
 * Cache entry with value and expiration metadata.
 */
export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Cache statistics for monitoring and observability.
 */
export interface CacheStats {
  /** Current number of entries in cache */
  size: number;
  /** Maximum allowed entries (undefined if unbounded) */
  maxSize: number | undefined;
  /** All cache keys currently stored */
  keys: string[];
  /** Cache hit rate (hits / total requests), 0-1 range */
  hitRate: number;
}

/**
 * Minimal cache interface with TTL support.
 */
export interface Cache {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttlMs: number): void;
  delete(key: string): void;
  clear(): void;
  /** Get cache statistics for monitoring */
  getStats(): CacheStats;
}

/**
 * Options for creating a memory cache instance.
 */
export interface MemoryCacheOptions {
  /**
   * Default TTL in milliseconds when not specified in set().
   * If not provided, ttlMs is required in every set() call.
   */
  defaultTtlMs?: number;
  /**
   * Maximum number of cache entries allowed.
   * When limit is reached, least recently used entries are evicted.
   * If not provided, cache can grow unbounded (not recommended for production).
   */
  maxSize?: number;
}

