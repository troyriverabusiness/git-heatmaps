import { createHash } from 'crypto';

/**
 * Creates a SHA-256 hash of a token for cache key generation.
 * Returns first 16 characters of hex digest for brevity while maintaining
 * strong uniqueness guarantees (2^64 possible values).
 *
 * @param token - The token to hash (GitHub or GitLab access token)
 * @returns First 16 characters of SHA-256 hex digest
 */
export function hashToken(token: string): string {
  const hash = createHash('sha256');
  hash.update(token);
  return hash.digest('hex').substring(0, 16);
}
