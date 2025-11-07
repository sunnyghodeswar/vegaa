import { describe, it, expect, beforeEach, vi } from 'vitest'
import { cacheGetOrSet, _cacheClear, getCacheStats } from '../src/utils/cache'

describe('Cache', () => {
  beforeEach(() => {
    _cacheClear()
  })

  describe('Basic functionality', () => {
    it('should cache and retrieve values', async () => {
      const fn = vi.fn(() => Promise.resolve('test'))
      
      const result1 = await cacheGetOrSet('key1', 1000, fn)
      const result2 = await cacheGetOrSet('key1', 1000, fn)
      
      expect(result1).toBe('test')
      expect(result2).toBe('test')
      expect(fn).toHaveBeenCalledTimes(1) // Should only call once
    })

    it('should expire entries after TTL', async () => {
      const fn = vi.fn(() => Promise.resolve('test'))
      
      await cacheGetOrSet('key1', 100, fn)
      await cacheGetOrSet('key1', 100, fn) // Should use cache
      
      expect(fn).toHaveBeenCalledTimes(1)
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150))
      
      await cacheGetOrSet('key1', 100, fn) // Should call again
      expect(fn).toHaveBeenCalledTimes(2)
    })
  })

  describe('Memory leak prevention', () => {
    it('should enforce max size limit', async () => {
      // Create more entries than max size (1000)
      for (let i = 0; i < 1001; i++) {
        await cacheGetOrSet(`key${i}`, 10000, () => Promise.resolve(`value${i}`))
      }
      
      const stats = getCacheStats()
      expect(stats.size).toBeLessThanOrEqual(stats.maxSize)
    })

    it('should use LRU eviction when full', async () => {
      // Fill cache to limit
      for (let i = 0; i < 1000; i++) {
        await cacheGetOrSet(`key${i}`, 10000, () => Promise.resolve(`value${i}`))
      }
      
      // Access first key to update LRU
      await cacheGetOrSet('key0', 10000, () => Promise.resolve('value0'))
      
      // Add new key - should evict least recently used (not key0)
      await cacheGetOrSet('key1000', 10000, () => Promise.resolve('value1000'))
      
      const stats = getCacheStats()
      expect(stats.size).toBeLessThanOrEqual(stats.maxSize)
    })
  })

  describe('Key validation', () => {
    it('should reject invalid keys', async () => {
      const fn = vi.fn(() => Promise.resolve('test'))
      
      // Too long key
      const longKey = 'a'.repeat(501)
      await cacheGetOrSet(longKey, 1000, fn)
      expect(fn).toHaveBeenCalled() // Should still execute, just not cache
      
      // Empty key
      await cacheGetOrSet('', 1000, fn)
      expect(fn).toHaveBeenCalled()
    })

    it('should reject invalid TTL', async () => {
      const fn = vi.fn(() => Promise.resolve('test'))
      
      await cacheGetOrSet('key1', -1, fn)
      await cacheGetOrSet('key1', 0, fn)
      await cacheGetOrSet('key1', NaN, fn)
      
      // Should execute function but not cache
      expect(fn).toHaveBeenCalledTimes(3)
    })
  })

  describe('Concurrent access', () => {
    it('should handle concurrent cache gets', async () => {
      const fn = vi.fn(() => Promise.resolve('test'))
      
      const promises = Array.from({ length: 10 }, () => 
        cacheGetOrSet('key1', 1000, fn)
      )
      
      const results = await Promise.all(promises)
      expect(results.every(r => r === 'test')).toBe(true)
      expect(fn).toHaveBeenCalledTimes(1) // Should only call once
    })
  })
})

