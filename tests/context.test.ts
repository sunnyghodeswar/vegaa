import { describe, it, expect, beforeEach, vi } from 'vitest'
import { buildContext } from '../src/utils/context'
import http from 'http'

describe('Context Building', () => {
  let mockReq: http.IncomingMessage
  let mockRes: http.ServerResponse

  beforeEach(() => {
    mockReq = {
      url: '/test?foo=bar&baz=qux',
      method: 'GET',
      headers: {},
      on: vi.fn(),
    } as any

    mockRes = {
      writableEnded: false,
      headersSent: false,
      statusCode: 200,
      setHeader: vi.fn(),
      end: vi.fn(),
      once: vi.fn(),
    } as any as http.ServerResponse
  })

  describe('Basic context creation', () => {
    it('should create context with correct properties', () => {
      const ctx = buildContext(mockReq, mockRes)

      expect(ctx).toHaveProperty('req', mockReq)
      expect(ctx).toHaveProperty('res', mockRes)
      expect(ctx).toHaveProperty('pathname', '/test')
      expect(ctx).toHaveProperty('query')
      expect(ctx).toHaveProperty('params', {})
      expect(ctx).toHaveProperty('_ended', false)
      expect(ctx).toHaveProperty('makeRequest')
    })

    it('should parse query string correctly', () => {
      const ctx = buildContext(mockReq, mockRes)

      expect(ctx.query).toEqual({
        foo: 'bar',
        baz: 'qux',
      })
    })

    it('should handle URL without query string', () => {
      mockReq.url = '/test'
      const ctx = buildContext(mockReq, mockRes)

      expect(ctx.pathname).toBe('/test')
      expect(ctx.query).toEqual({})
    })
  })

  describe('Response helpers', () => {
    it('should provide json helper', () => {
      const ctx = buildContext(mockReq, mockRes)
      const res = ctx.res as any
      const result = res.json({ test: 'value' })

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json')
      expect(mockRes.end).toHaveBeenCalled()
      expect(ctx._ended).toBe(true)
      expect(result).toBe(mockRes)
    })

    it('should provide send helper', () => {
      const ctx = buildContext(mockReq, mockRes)
      const res = ctx.res as any
      res.send({ test: 'value' })

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json')
      expect(mockRes.end).toHaveBeenCalled()
      expect(ctx._ended).toBe(true)
    })

    it('should provide html helper', () => {
      const ctx = buildContext(mockReq, mockRes)
      const res = ctx.res as any
      res.html('<h1>Test</h1>')

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html; charset=utf-8')
      expect(mockRes.end).toHaveBeenCalledWith('<h1>Test</h1>')
      expect(ctx._ended).toBe(true)
    })

    it('should provide text helper', () => {
      const ctx = buildContext(mockReq, mockRes)
      const res = ctx.res as any
      res.text('test text')

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain; charset=utf-8')
      expect(mockRes.end).toHaveBeenCalledWith('test text')
      expect(ctx._ended).toBe(true)
    })

    it('should provide status helper', () => {
      const ctx = buildContext(mockReq, mockRes)
      const res = ctx.res as any
      const result = res.status(404)

      expect(mockRes.statusCode).toBe(404)
      expect(result).toBe(mockRes)
    })

    it('should provide type helper', () => {
      const ctx = buildContext(mockReq, mockRes)
      const res = ctx.res as any
      const result = res.type('text/xml')

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/xml')
      expect(result).toBe(mockRes)
    })
  })

  describe('Memory leak prevention', () => {
    it('should clean up _ctxRef when response ends', () => {
      const ctx = buildContext(mockReq, mockRes)
      
      // _ctxRef should be set
      expect((mockRes as any)._ctxRef).toBe(ctx)
      
      // End response
      const res = ctx.res as any
      res.json({ test: 'value' })
      
      // _ctxRef should be cleaned up
      expect((mockRes as any)._ctxRef).toBeUndefined()
    })

    it('should set up finish event listener', () => {
      buildContext(mockReq, mockRes)
      
      expect(mockRes.once).toHaveBeenCalledWith('finish', expect.any(Function))
    })

    it('should not set headers if response already ended', () => {
      const ctx = buildContext(mockReq, mockRes)
      // Use Object.defineProperty to set read-only property for testing
      Object.defineProperty(mockRes, 'writableEnded', { value: true, writable: true, configurable: true })
      
      const res = ctx.res as any
      res.json({ test: 'value' })
      
      expect(mockRes.setHeader).not.toHaveBeenCalled()
      expect(mockRes.end).not.toHaveBeenCalled()
    })
  })

  describe('Error handling', () => {
    it('should handle JSON serialization errors', () => {
      const ctx = buildContext(mockReq, mockRes)
      const res = ctx.res as any
      const circular: any = {}
      circular.self = circular
      
      // Should not throw
      expect(() => res.json(circular)).not.toThrow()
      expect(mockRes.end).toHaveBeenCalled()
    })
  })
})

