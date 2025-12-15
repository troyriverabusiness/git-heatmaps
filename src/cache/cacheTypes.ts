/**
 * Cache entry with value and expiration metadata.
 */
export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Minimal cache interface with TTL support.
 */
export interface Cache {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttlMs: number): void;
  delete(key: string): void;
  clear(): void;
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
}

