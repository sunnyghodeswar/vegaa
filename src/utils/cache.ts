type CacheEntry = { data: any; time: number }
const cache = new Map<string, CacheEntry>()

export async function cacheGetOrSet(key: string, ttl: number, fn: () => Promise<any>) {
  const now = Date.now()
  const entry = cache.get(key)
  if (entry && now - entry.time < ttl) return entry.data
  const data = await fn()
  cache.set(key, { data, time: now })
  return data
}

// Export for testing
export function _cacheClear() { cache.clear() }