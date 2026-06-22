// v2: bumped to invalidate stale baseline TVL/fees values cached from v1
const CACHE_PREFIX = 'eltnam:data:v2:';
const CACHE_TTL_MS = 10 * 60 * 1000;

interface CachedPayload<T> {
  value: T;
  savedAt: number;
}

export function readCachedData<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPayload<T>;
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > CACHE_TTL_MS) return null;
    return parsed.value;
  } catch {
    return null;
  }
}

export function writeCachedData<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      `${CACHE_PREFIX}${key}`,
      JSON.stringify({ value, savedAt: Date.now() } satisfies CachedPayload<T>)
    );
  } catch {
    // Storage can be unavailable in private mode; live fetch still works.
  }
}
