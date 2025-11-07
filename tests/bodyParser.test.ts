import { describe, it, expect, beforeEach, vi } from 'vitest'
import { bodyParser } from '../src/plugins/bodyParser'
import { buildContext } from '../src/utils/context'
import http from 'http'

describe('Body Parser', () => {
  let mockReq: http.IncomingMessage
  let mockRes: http.ServerResponse
  let ctx: any

  beforeEach(() => {
    mockReq = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      on: vi.fn(),
      removeListener: vi.fn(),
      destroy: vi.fn(),
    } as any

    mockRes = {
      writableEnded: false,
      headersSent: false,
      statusCode: 200,
      setHeader: vi.fn(),
      end: vi.fn(),
      once: vi.fn(),
    } as any

    ctx = buildContext(mockReq, mockRes)
  })

  describe('JSON parsing', () => {
    it('should parse JSON body', async () => {
      const parser = bodyParser()
      const data = { name: 'test', value: 123 }
      
      // Simulate data events
      const chunks = [Buffer.from(JSON.stringify(data))]
      let dataHandler: ((chunk: Buffer) => void) | undefined
      let endHandler: (() => void) | undefined

      ;(mockReq.on as any).mockImplementation((event: string, handler: any) => {
        if (event === 'data') dataHandler = handler
        if (event === 'end') endHandler = handler
      })

      const promise = parser(ctx)
      
      // Emit data
      if (dataHandler) {
        chunks.forEach(chunk => dataHandler!(chunk))
      }
      
      // Emit end
      if (endHandler) endHandler()
      
      await promise
      
      expect(ctx.body).toEqual(data)
    })

    it('should handle empty JSON body', async () => {
      const parser = bodyParser()
      
      let endHandler: (() => void) | undefined
      ;(mockReq.on as any).mockImplementation((event: string, handler: any) => {
        if (event === 'end') endHandler = handler
      })

      const promise = parser(ctx)
      if (endHandler) endHandler()
      await promise
      
      expect(ctx.body).toEqual({})
    })
  })

  describe('Size limit', () => {
    it('should reject payload exceeding limit', async () => {
      const parser = bodyParser({ limit: 100 })
      const largeData = 'x'.repeat(200)
      
      let dataHandler: ((chunk: Buffer) => void) | undefined
      let errorHandler: ((err: Error) => void) | undefined
      let endHandler: (() => void) | undefined
      
      // Set up mock to capture handlers
      const handlers: Record<string, any> = {}
      ;(mockReq.on as any).mockImplementation((event: string, handler: any) => {
        handlers[event] = handler
        if (event === 'data') dataHandler = handler
        if (event === 'error') errorHandler = handler
        if (event === 'end') endHandler = handler
      })

      const promise = parser(ctx)
      
      // Wait for handlers to be registered
      await new Promise(resolve => setImmediate(resolve))
      
      // Emit large chunk - this should trigger rejection
      if (dataHandler) {
        dataHandler(Buffer.from(largeData))
      }
      
      // The promise should reject when limit is exceeded
      await expect(promise).rejects.toThrow('Payload limit exceeded')
      expect(mockReq.destroy).toHaveBeenCalled()
      expect(ctx._ended).toBe(true)
      expect(mockRes.statusCode).toBe(413)
    })

    it('should accept payload within limit', async () => {
      const parser = bodyParser({ limit: 1000 })
      const data = { name: 'test' }
      
      let dataHandler: ((chunk: Buffer) => void) | undefined
      let endHandler: (() => void) | undefined

      ;(mockReq.on as any).mockImplementation((event: string, handler: any) => {
        if (event === 'data') dataHandler = handler
        if (event === 'end') endHandler = handler
      })

      const promise = parser(ctx)
      
      if (dataHandler) {
        dataHandler(Buffer.from(JSON.stringify(data)))
      }
      
      if (endHandler) endHandler()
      await promise
      
      expect(ctx.body).toEqual(data)
    })
  })

  describe('Content type handling', () => {
    it('should skip GET requests', async () => {
      mockReq.method = 'GET'
      const parser = bodyParser()
      
      await parser(ctx)
      
      expect(ctx.body).toBeUndefined()
    })

    it('should skip when body already exists', async () => {
      ctx.body = { existing: true }
      const parser = bodyParser()
      
      await parser(ctx)
      
      expect(ctx.body).toEqual({ existing: true })
    })

    it('should skip when no content-type', async () => {
      mockReq.headers = {}
      const parser = bodyParser()
      
      await parser(ctx)
      
      expect(ctx.body).toBeUndefined()
    })
  })

  describe('Error handling', () => {
    it('should handle request errors gracefully', async () => {
      const parser = bodyParser()
      let errorHandler: ((err: Error) => void) | undefined
      
      // Set content-type so middleware doesn't return early
      mockReq.headers['content-type'] = 'application/json'
      
      ;(mockReq.on as any).mockImplementation((event: string, handler: any) => {
        if (event === 'error') errorHandler = handler
      })

      const promise = parser(ctx)
      
      // Wait for handlers to be registered
      await new Promise(resolve => setImmediate(resolve))
      
      // Trigger error - this should cause the promise to reject
      if (errorHandler) {
        errorHandler(new Error('Request error'))
      }
      
      // The promise should reject when error occurs
      // Use expect().rejects to properly catch the rejection
      await expect(promise).rejects.toThrow('Request error')
    })

    it('should handle invalid JSON gracefully', async () => {
      const parser = bodyParser()
      let dataHandler: ((chunk: Buffer) => void) | undefined
      let endHandler: (() => void) | undefined

      ;(mockReq.on as any).mockImplementation((event: string, handler: any) => {
        if (event === 'data') dataHandler = handler
        if (event === 'end') endHandler = handler
      })

      const promise = parser(ctx)
      
      if (dataHandler) {
        dataHandler(Buffer.from('invalid json'))
      }
      
      if (endHandler) endHandler()
      
      // Should handle error and set 400 status
      try {
        await promise
      } catch {
        // Expected to fail
      }
      
      expect(ctx._ended).toBe(true)
      expect(mockRes.statusCode).toBe(400)
    })
  })

  describe('Event listener cleanup', () => {
    it('should clean up event listeners on limit exceeded', async () => {
      const parser = bodyParser({ limit: 10 })
      const removeListener = vi.fn()
      mockReq.removeListener = removeListener
      
      let dataHandler: ((chunk: Buffer) => void) | undefined
      let endHandler: (() => void) | undefined
      ;(mockReq.on as any).mockImplementation((event: string, handler: any) => {
        if (event === 'data') dataHandler = handler
        if (event === 'end') endHandler = handler
      })

      const promise = parser(ctx)
      
      // Wait for handlers to be registered
      await new Promise(resolve => setImmediate(resolve))
      
      // Trigger data handler with data exceeding limit
      if (dataHandler) {
        dataHandler(Buffer.from('x'.repeat(20)))
      }
      
      // The promise should reject when limit is exceeded
      await expect(promise).rejects.toThrow('Payload limit exceeded')
      
      // Should have removed listeners
      expect(removeListener).toHaveBeenCalled()
    })
  })
})

