export type CacheGetArgs = {
  key: string;
};

export type CacheSetArgs = {
  key: string;
  value: string;
  ttlSeconds?: number;
};

export type Cache = {
  get(args: CacheGetArgs): Promise<string | undefined>;
  set(args: CacheSetArgs): Promise<void>;
};

type CreateCacheArgs = {
  // TODO: Allow configuring an external cache (Redis) and/or namespacing keys.
};

export function createCache(_args: CreateCacheArgs = {}): Cache {
  // Minimal in-memory implementation for local dev.
  // TODO: Replace with Redis (or similar) for multi-instance deployments.
  const map = new Map<string, string>();

  return {
    async get({ key }) {
      return map.get(key);
    },
    async set({ key, value }) {
      // TODO: Implement TTL support.
      map.set(key, value);
    }
  };
}


