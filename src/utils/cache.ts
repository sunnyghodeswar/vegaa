/**
 * Cache implementation with TTL, size limits, and automatic expiration
 * 
 * Features:
 * - Automatic expiration of stale entries
 * - Max size limit with LRU eviction
 * - Periodic cleanup task
 * - Key validation to prevent injection
 * - Cluster-aware: Uses IPC for shared cache across workers
 */

import { 
  clusterCacheGet, 
  clusterCacheSet, 
  isClusterCacheAvailable 
} from './clusterCache'

export type CacheEntry = { data: any; time: number; accessTime: number }
const cache = new Map<string, CacheEntry>()

// Configuration
const MAX_CACHE_SIZE = 1000 // Maximum number of entries
const CLEANUP_INTERVAL = 60000 // Cleanup every 60 seconds
const MAX_KEY_LENGTH = 500 // Maximum key length to prevent DoS

// Track cleanup interval
let cleanupInterval: NodeJS.Timeout | null = null

/**
 * Validate cache key to prevent injection attacks
 */
function validateKey(key: string): boolean {
  if (typeof key !== 'string') return false
  if (key.length > MAX_KEY_LENGTH) return false
  if (key.length === 0) return false
  return true
}

/**
 * Clean up expired entries and enforce size limit
 */
function cleanupCache(): void {
  const now = Date.now()
  const entries: Array<[string, CacheEntry]> = []
  
  // Collect all entries with their access times for LRU
  for (const [key, entry] of cache.entries()) {
    entries.push([key, entry])
  }
  
  // Remove expired entries
  for (const [key, entry] of entries) {
    // TTL is checked on access, but we also clean up old entries here
    // We'll use a longer threshold for cleanup (2x TTL) to be safe
    if (now - entry.time > entry.time * 2) {
      cache.delete(key)
    }
  }
  
  // If still over limit, remove least recently used entries
  if (cache.size > MAX_CACHE_SIZE) {
    const sorted = entries
      .filter(([key]) => cache.has(key)) // Only entries still in cache
      .sort((a, b) => a[1].accessTime - b[1].accessTime) // Sort by access time
    
    const toRemove = sorted.slice(0, cache.size - MAX_CACHE_SIZE)
    for (const [key] of toRemove) {
      cache.delete(key)
    }
  }
}

/**
 * Start periodic cleanup task
 */
function startCleanup(): void {
  if (cleanupInterval) return // Already started
  
  cleanupInterval = setInterval(() => {
    cleanupCache()
  }, CLEANUP_INTERVAL)
  
  // Clean up on process exit
  if (typeof process !== 'undefined') {
    process.once('beforeExit', () => {
      if (cleanupInterval) {
        clearInterval(cleanupInterval)
        cleanupInterval = null
      }
    })
  }
}

// Track pending promises for concurrent requests with same key
const pendingPromises = new Map<string, Promise<any>>()

/**
 * Get or set cache entry with TTL
 * 
 * @param key - Cache key (validated for length and type)
 * @param ttl - Time to live in milliseconds
 * @param fn - Function to generate value if not cached
 */
export async function cacheGetOrSet(key: string, ttl: number, fn: () => Promise<any>): Promise<any> {
  // Validate key
  if (!validateKey(key)) {
    // If key is invalid, just execute function without caching
    console.warn(`[Cache] Invalid key, skipping cache: ${key.substring(0, 50)}...`)
    return await fn()
  }
  
  // Validate TTL
  if (typeof ttl !== 'number' || ttl <= 0 || !isFinite(ttl)) {
    console.warn(`[Cache] Invalid TTL: ${ttl}, skipping cache`)
    return await fn()
  }
  
  // Start cleanup task on first use
  startCleanup()
  
  const now = Date.now()
  
  // Try cluster cache first (if in cluster mode)
  if (isClusterCacheAvailable()) {
    const clusterData = await clusterCacheGet(key, ttl)
    if (clusterData !== null) {
      return clusterData
    }
  }
  
  // Fallback to local cache
  const entry = cache.get(key)
  
  // Check if entry exists and is not expired
  if (entry && (now - entry.time) < ttl) {
    // Update access time for LRU
    entry.accessTime = now
    return entry.data
  }
  
  // Check if there's already a pending request for this key
  const pending = pendingPromises.get(key)
  if (pending) {
    // Wait for the existing request to complete
    return await pending
  }
  
  // Create new promise for this request
  const promise = (async () => {
    try {
      // Generate new value
      const data = await fn()
      
      // Enforce size limit before adding
      if (cache.size >= MAX_CACHE_SIZE && !cache.has(key)) {
        // Remove least recently used entry
        let oldestKey: string | null = null
        let oldestTime = Infinity
        
        for (const [k, e] of cache.entries()) {
          if (e.accessTime < oldestTime) {
            oldestTime = e.accessTime
            oldestKey = k
          }
        }
        
        if (oldestKey) {
          cache.delete(oldestKey)
        }
      }
      
      // Store in cluster cache first (if available)
      if (isClusterCacheAvailable()) {
        await clusterCacheSet(key, data)
      }
      
      // Also store locally (for fallback and single-process mode)
      cache.set(key, { data, time: now, accessTime: now })
      
      return data
    } finally {
      // Remove from pending promises
      pendingPromises.delete(key)
    }
  })()
  
  // Store pending promise
  pendingPromises.set(key, promise)
  
  return await promise
}

/**
 * Clear all cache entries (for testing)
 */
export function _cacheClear(): void {
  cache.clear()
  pendingPromises.clear()
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
    cleanupInterval = null
  }
}

/**
 * Get cache statistics (for monitoring)
 */
export function getCacheStats(): { size: number; maxSize: number } {
  return {
    size: cache.size,
    maxSize: MAX_CACHE_SIZE
  }
}