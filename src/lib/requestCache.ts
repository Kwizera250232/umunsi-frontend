type CacheEntry<T> = {
  data: T;
  expires: number;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();
const inflightRequests = new Map<string, Promise<unknown>>();

const readPersisted = <T>(persistKey: string): CacheEntry<T> | null => {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(persistKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed?.expires || parsed.expires <= Date.now()) {
      sessionStorage.removeItem(persistKey);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const writePersisted = <T>(persistKey: string, entry: CacheEntry<T>) => {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(persistKey, JSON.stringify(entry));
  } catch {
    // Quota exceeded — ignore.
  }
};

export const buildCacheKey = (prefix: string, params?: Record<string, unknown>) => {
  if (!params || Object.keys(params).length === 0) return prefix;
  const sorted = Object.keys(params)
    .sort()
    .map((key) => `${key}=${String(params[key])}`)
    .join('&');
  return `${prefix}?${sorted}`;
};

/** Dedupe in-flight calls and serve fresh-enough cached responses. */
export const cachedRequest = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { ttlMs?: number; persistKey?: string; revalidate?: boolean },
): Promise<T> => {
  const ttlMs = options?.ttlMs ?? 120_000;
  const now = Date.now();

  if (options?.persistKey) {
    const persisted = readPersisted<T>(options.persistKey);
    if (persisted) {
      memoryCache.set(key, persisted);
      if (!options.revalidate) {
        return persisted.data;
      }
    }
  }

  const cached = memoryCache.get(key);
  if (cached && cached.expires > now) {
    if (options?.revalidate) {
      void cachedRequest(key, fetcher, { ...options, revalidate: false }).catch(() => undefined);
    }
    return cached.data as T;
  }

  const inflight = inflightRequests.get(key);
  if (inflight) {
    return inflight as Promise<T>;
  }

  const promise = fetcher()
    .then((data) => {
      const entry: CacheEntry<T> = { data, expires: Date.now() + ttlMs };
      memoryCache.set(key, entry);
      if (options?.persistKey) {
        writePersisted(options.persistKey, entry);
      }
      return data;
    })
    .finally(() => {
      inflightRequests.delete(key);
    });

  inflightRequests.set(key, promise);
  return promise;
};

export const invalidateCacheKey = (key: string) => {
  memoryCache.delete(key);
  inflightRequests.delete(key);
};

const clearSessionKeysMatching = (matcher: (key: string) => boolean) => {
  if (typeof sessionStorage === 'undefined') return;
  for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = sessionStorage.key(index);
    if (key && matcher(key)) {
      sessionStorage.removeItem(key);
    }
  }
};

export const invalidateCachePrefix = (prefix: string) => {
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
      inflightRequests.delete(key);
    }
  }

  clearSessionKeysMatching(
    (key) =>
      key.startsWith(`umunsi_${prefix}`) ||
      key.includes(`_${prefix}_`) ||
      key.startsWith(`${prefix}_`) ||
      (prefix === 'posts' && key.startsWith('umunsi_posts_')) ||
      (prefix === 'categories' && key.startsWith('umunsi_categories')) ||
      (prefix === 'post' && key.startsWith('umunsi_post_')),
  );
};

/** Clear cached public content (use after publishing or when data looks stale). */
export const clearPublicContentCaches = () => {
  invalidateCachePrefix('posts');
  invalidateCachePrefix('post');
  invalidateCachePrefix('categories');
  clearSessionKeysMatching((key) => key.startsWith('umunsi_home_cache') || key.startsWith('umunsi_category_page_'));
};
