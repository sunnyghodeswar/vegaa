import { describe, it, expect, beforeEach } from 'vitest'
import { Semaphore } from '../src/utils/semaphore'

describe('Semaphore', () => {
  let sem: Semaphore

  beforeEach(() => {
    sem = new Semaphore(2) // Limit of 2
  })

  describe('Basic functionality', () => {
    it('should allow acquiring permits up to limit', async () => {
      await sem.acquire()
      await sem.acquire()
      expect(sem.getCount()).toBe(2)
    })

    it('should block when limit is reached', async () => {
      await sem.acquire()
      await sem.acquire()
      
      let acquired = false
      const promise = sem.acquire().then(() => {
        acquired = true
      })
      
      // Should not acquire immediately
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(acquired).toBe(false)
      
      // Release one, should allow acquire
      sem.release()
      await promise
      expect(acquired).toBe(true)
    })

    it('should release permits correctly', () => {
      expect(sem.getCount()).toBe(0)
      sem.release() // Should not go negative
      expect(sem.getCount()).toBe(0)
    })
  })

  describe('Race condition prevention', () => {
    it('should handle concurrent acquires correctly', async () => {
      const promises = Array.from({ length: 10 }, () => sem.acquire())
      await Promise.all(promises.slice(0, 2)) // First 2 should acquire immediately
      
      expect(sem.getCount()).toBe(2)
      
      // Release and let others acquire
      sem.release()
      sem.release()
      
      await Promise.all(promises.slice(2, 4))
      expect(sem.getCount()).toBe(2)
    })

    it('should prevent double release issues', () => {
      sem.release() // Release without acquire
      sem.release() // Release again
      expect(sem.getCount()).toBe(0) // Should not go negative
    })
  })

  describe('Memory leak prevention', () => {
    it('should not accumulate waiters indefinitely', async () => {
      // Acquire all permits
      await sem.acquire()
      await sem.acquire()
      
      // Create many waiters
      const waiters = Array.from({ length: 5 }, () => sem.acquire())
      
      expect(sem.getWaitersCount()).toBe(5)
      
      // Release permits one by one
      sem.release()
      await waiters[0]
      expect(sem.getWaitersCount()).toBe(4)
      
      sem.release()
      await waiters[1]
      expect(sem.getWaitersCount()).toBe(3)
    })
  })

  describe('Edge cases', () => {
    it('should throw error for invalid limit', () => {
      expect(() => new Semaphore(0)).toThrow()
      expect(() => new Semaphore(-1)).toThrow()
    })

    it('should handle rapid acquire/release cycles', async () => {
      for (let i = 0; i < 100; i++) {
        await sem.acquire()
        sem.release()
      }
      expect(sem.getCount()).toBe(0)
      expect(sem.getWaitersCount()).toBe(0)
    })
  })
})

