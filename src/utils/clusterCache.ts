/**
 * Cluster-aware cache with inter-process communication
 * 
 * Provides transparent caching across cluster workers using fast IPC.
 * Master process maintains the cache, workers request via IPC.
 * 
 * Features:
 * - Automatic detection of cluster mode
 * - Fast IPC communication (no serialization overhead for simple operations)
 * - Transparent API (same as regular cache)
 * - Automatic fallback to local cache in single-process mode
 */

import cluster from 'cluster'
import type { CacheEntry } from './cache'

// Message types for IPC
const CACHE_GET = 'cache:get'
const CACHE_SET = 'cache:set'
const CACHE_HAS = 'cache:has'
const CACHE_DELETE = 'cache:delete'
const CACHE_CLEAR = 'cache:clear'

// Track pending promises for cache operations (with resolve/reject functions)
type PendingPromise = {
  resolve: (value: any) => void
  reject: (error: Error) => void
}

// Master process cache (shared across all workers)
const masterCache = new Map<string, CacheEntry>()
const pendingPromises = new Map<string, PendingPromise>()

// Track if we're in cluster mode
const isClusterMode = cluster.isPrimary || cluster.isWorker

// Track if handlers are already set up (prevent duplicate registrations)
let handlersSetup = false

/**
 * Setup IPC handlers for cache operations
 */
export function setupClusterCache(): void {
  if (!isClusterMode) return
  if (handlersSetup) return // Prevent duplicate handler registration
  
  if (cluster.isPrimary) {
    // Master process: Handle cache requests from workers
    cluster.on('message', (worker, message: any) => {
      if (!message || typeof message !== 'object' || !message.type) return
      
      const { type, key, data, ttl, id } = message
      const now = Date.now()
      
      switch (type) {
        case CACHE_GET: {
          const entry = masterCache.get(key)
          if (entry && (now - entry.time) < ttl) {
            entry.accessTime = now
            worker.send({ type: CACHE_GET, id, data: entry.data, hit: true })
          } else {
            worker.send({ type: CACHE_GET, id, hit: false })
          }
          break
        }
        
        case CACHE_SET: {
          masterCache.set(key, { data, time: now, accessTime: now })
          worker.send({ type: CACHE_SET, id, success: true })
          break
        }
        
        case CACHE_HAS: {
          const entry = masterCache.get(key)
          const has = entry ? (now - entry.time) < ttl : false
          worker.send({ type: CACHE_HAS, id, has })
          break
        }
        
        case CACHE_DELETE: {
          masterCache.delete(key)
          worker.send({ type: CACHE_DELETE, id, success: true })
          break
        }
        
        case CACHE_CLEAR: {
          masterCache.clear()
          // Broadcast to all workers
          for (const id in cluster.workers) {
            cluster.workers[id]?.send({ type: CACHE_CLEAR, id: message.id })
          }
          break
        }
      }
    })
    handlersSetup = true
  } else if (cluster.isWorker && process.send) {
    // Worker process: Setup response handlers
    process.on('message', (message: any) => {
      if (!message || typeof message !== 'object' || !message.type || !message.id) return
      
      const pending = pendingPromises.get(message.id)
      if (pending) {
        pending.resolve(message)
        pendingPromises.delete(message.id)
      }
    })
    handlersSetup = true
  }
}

/**
 * Generate unique message ID for IPC
 */
let messageIdCounter = 0
function generateMessageId(): string {
  return `${process.pid}-${Date.now()}-${++messageIdCounter}`
}

/**
 * Send IPC message and wait for response (with timeout)
 */
function sendMessage(message: any, timeout = 1000): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!cluster.isWorker || !process.send) {
      // Not in cluster mode or can't send, resolve immediately
      resolve(null)
      return
    }
    
    const id = generateMessageId()
    message.id = id
    
    const timeoutId = setTimeout(() => {
      pendingPromises.delete(id)
      reject(new Error('Cache IPC timeout'))
    }, timeout)
    
    const pending: PendingPromise = {
      resolve: (response: any) => {
        clearTimeout(timeoutId)
        resolve(response)
      },
      reject: (error: Error) => {
        clearTimeout(timeoutId)
        reject(error)
      }
    }
    
    pendingPromises.set(id, pending)
    process.send!(message)
  })
}

/**
 * Cluster-aware cache get
 */
export async function clusterCacheGet(key: string, ttl: number): Promise<any | null> {
  if (!isClusterMode || !cluster.isWorker) {
    // Fallback to local cache (will be handled by regular cache)
    return null
  }
  
  try {
    const response = await sendMessage({ type: CACHE_GET, key, ttl })
    return response?.hit ? response.data : null
  } catch {
    // IPC failed, fallback to local
    return null
  }
}

/**
 * Cluster-aware cache set
 */
export async function clusterCacheSet(key: string, data: any): Promise<void> {
  if (!isClusterMode || !cluster.isWorker) {
    // Fallback to local cache (will be handled by regular cache)
    return
  }
  
  try {
    await sendMessage({ type: CACHE_SET, key, data })
  } catch {
    // IPC failed, silently ignore (cache is best-effort)
  }
}

/**
 * Cluster-aware cache has
 */
export async function clusterCacheHas(key: string, ttl: number): Promise<boolean> {
  if (!isClusterMode || !cluster.isWorker) {
    return false
  }
  
  try {
    const response = await sendMessage({ type: CACHE_HAS, key, ttl })
    return response?.has || false
  } catch {
    return false
  }
}

/**
 * Check if cluster cache is available
 */
export function isClusterCacheAvailable(): boolean {
  return isClusterMode && cluster.isWorker && typeof process.send === 'function'
}

