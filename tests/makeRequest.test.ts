import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { makeRequest } from '../src/utils/makeRequest'

describe('makeRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic functionality', () => {
    it('should make GET request', async () => {
      const builder = makeRequest()
      const result = await builder
        .url('https://jsonplaceholder.typicode.com/posts/1')
        .get()
        .json()

      expect(result).toBeDefined()
      expect(result).toHaveProperty('id')
    })

    it('should make POST request with body', async () => {
      const builder = makeRequest()
      const result = await builder
        .url('https://jsonplaceholder.typicode.com/posts')
        .post()
        .body({ title: 'test', body: 'test body' })
        .json()

      expect(result).toBeDefined()
      expect(result).toHaveProperty('id')
    })

    it('should handle text response', async () => {
      const builder = makeRequest()
      const result = await builder
        .url('https://jsonplaceholder.typicode.com/posts/1')
        .get()
        .text()

      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('Timeout handling', () => {
    it('should timeout after specified duration', async () => {
      const builder = makeRequest({ timeout: 100 })
      
      await expect(
        builder
          .url('https://httpbin.org/delay/2')
          .get()
          .json()
      ).rejects.toThrow(/timeout|aborted/i)
    }, 10000)

    it('should apply timeout to all methods', async () => {
      const builder = makeRequest()
      
      await expect(
        builder
          .url('https://httpbin.org/delay/2')
          .timeout(100)
          .get()
          .text()
      ).rejects.toThrow(/timeout|aborted/i)
    }, 10000)

    it('should handle timeout configuration', () => {
      const builder = makeRequest({ timeout: 5000 })
      expect(() => builder.timeout(1000)).not.toThrow()
    })
  })

  describe('Error handling', () => {
    it('should throw error for invalid URL', async () => {
      const builder = makeRequest()
      
      await expect(
        builder
          .url('not-a-valid-url')
          .get()
          .json()
      ).rejects.toThrow()
    })

    it('should throw error when URL not provided', async () => {
      const builder = makeRequest()
      
      await expect(
        builder.get().json()
      ).rejects.toThrow('URL is required')
    })

    it('should validate timeout value', () => {
      const builder = makeRequest()
      
      expect(() => builder.timeout(-1)).toThrow()
      expect(() => builder.timeout(0)).toThrow()
      expect(() => builder.timeout(1000)).not.toThrow()
    })
  })

  describe('Method chaining', () => {
    it('should support method chaining', () => {
      const builder = makeRequest()
      const result = builder
        .url('https://jsonplaceholder.typicode.com/posts/1')
        .get()
        .headers({ 'Custom-Header': 'value' })

      expect(result).toBe(builder)
    })

    it('should support all HTTP methods', () => {
      const builder = makeRequest()
      const url = 'https://jsonplaceholder.typicode.com/posts/1'
      
      expect(() => builder.url(url).get()).not.toThrow()
      expect(() => builder.url(url).post()).not.toThrow()
      expect(() => builder.url(url).put()).not.toThrow()
      expect(() => builder.url(url).delete()).not.toThrow()
      expect(() => builder.url(url).patch()).not.toThrow()
    })
  })

  describe('Headers and body', () => {
    it('should set custom headers', async () => {
      const builder = makeRequest()
      
      try {
        const result = await builder
          .url('https://httpbin.org/headers')
          .headers({ 'X-Custom-Header': 'test-value' })
          .get()
          .json()

        expect(result.headers['X-Custom-Header']).toBe('test-value')
      } catch (err: any) {
        // httpbin.org may be unavailable, skip test if service is down
        if (err.message?.includes('503') || err.message?.includes('Service Temporarily Unavailable')) {
          console.warn('httpbin.org unavailable, skipping test')
          return
        }
        throw err
      }
    }, 20000)

    it('should stringify object body', async () => {
      const builder = makeRequest()
      const body = { title: 'test', body: 'test body' }
      
      try {
        const result = await builder
          .url('https://httpbin.org/post')
          .post()
          .body(body)
          .json()

        expect(result.json).toEqual(body)
        expect(result.headers['Content-Type']).toContain('application/json')
      } catch (err: any) {
        // httpbin.org may be unavailable, skip test if service is down
        if (err.message?.includes('503') || err.message?.includes('Service Temporarily Unavailable')) {
          console.warn('httpbin.org unavailable, skipping test')
          return
        }
        throw err
      }
    }, 20000)
  })
})

