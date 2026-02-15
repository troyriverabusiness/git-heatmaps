import { hashToken } from '../utils/crypto';

/**
 * Parameters for building a source-specific cache key.
 */
export type CacheKeyParams = {
  provider: 'github' | 'gitlab';
  token: string;
  fromDate: string; // YYYY-MM-DD
  toDate: string;   // YYYY-MM-DD
};

/**
 * Builds a cache key for per-source contribution data.
 *
 * Format: "contrib:{source}:{tokenHash}:{fromDate}_{toDate}"
 * Example: "contrib:gh:a7f3c9d4e2b1f8a5:2025-01-01_2025-12-31"
 *
 * This enables:
 * - Token-based caching (same token = cache hit, even with different users)
 * - Per-source caching (GitHub and GitLab cached independently)
 * - Date range specificity (different ranges = different cache entries)
 * - Security (token hash prevents exposure in logs)
 *
 * @param params - Cache key parameters
 * @returns Cache key string
 */
export function buildSourceCacheKey(params: CacheKeyParams): string {
  const tokenHash = hashToken(params.token);
  const source = params.provider === 'github' ? 'gh' : 'gl';
  return `contrib:${source}:${tokenHash}:${params.fromDate}_${params.toDate}`;
}
