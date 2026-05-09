/**
 * Lightweight sessionStorage cache for page-level API data.
 * Restores state instantly on navigation; refreshes in the background.
 */

export interface CacheEntry<T> {
  ts: number;
  data: T;
}

export function readCache<T>(key: string, ttlMs: number): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - entry.ts > ttlMs) return null;
    return entry.data;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    const entry: CacheEntry<T> = { ts: Date.now(), data };
    window.sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // quota exceeded — skip silently
  }
}

export function clearCache(...keys: string[]): void {
  if (typeof window === "undefined") return;
  for (const key of keys) {
    try { window.sessionStorage.removeItem(key); } catch { /* */ }
  }
}
