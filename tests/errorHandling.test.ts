import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createApp } from '../src/core/app'
import http from 'http'

describe('Error Handling', () => {
  let app: any
  let server: http.Server | null = null

  beforeEach(() => {
    app = createApp()
  })

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve) => {
        server!.close(() => resolve())
      })
      server = null
    }
  })

  describe('Error handler coordination', () => {
    it('should not send multiple responses from error handlers', async () => {
      let responseCount = 0
      
      app.onError(async (ctx: any) => {
        responseCount++
        if (!ctx.res.headersSent) {
          ctx.res.statusCode = 500
          ctx.res.end(JSON.stringify({ error: 'Handler error' }))
        }
      })
      
      app.route('/error').get(() => {
        throw new Error('Test error')
      })
      
      await app.startServer({ port: 0 })
      server = (app as any).server

      const response = await fetch(`http://localhost:${(server!.address() as any).port}/error`)
      
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBeDefined()
      // Should only send one response
      expect(responseCount).toBe(1)
    })

    it('should handle errors after response sent', async () => {
      app.route('/error-after').get((ctx: any) => {
        ctx.res.end(JSON.stringify({ success: true }))
        // Error after response sent
        throw new Error('Error after response')
      })
      
      await app.startServer({ port: 0 })
      server = (app as any).server

      const response = await fetch(`http://localhost:${(server!.address() as any).port}/error-after`)
      
      // Should get successful response, not error
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })
  })

  describe('Middleware errors', () => {
    it('should handle middleware errors', async () => {
      app.middleware(() => {
        throw new Error('Middleware error')
      })
      
      app.route('/test').get(() => ({ test: true }))
      
      await app.startServer({ port: 0 })
      server = (app as any).server

      const response = await fetch(`http://localhost:${(server!.address() as any).port}/test`)
      
      expect(response.status).toBe(500)
    })

    it('should handle route middleware errors', async () => {
      app.route('/test')
        .middleware(() => {
          throw new Error('Route middleware error')
        })
        .get(() => ({ test: true }))
      
      await app.startServer({ port: 0 })
      server = (app as any).server

      const response = await fetch(`http://localhost:${(server!.address() as any).port}/test`)
      
      expect(response.status).toBe(500)
    })
  })

  describe('Error handler errors', () => {
    it('should handle errors in error handlers gracefully', async () => {
      app.onError(() => {
        throw new Error('Error in error handler')
      })
      
      app.route('/error').get(() => {
        throw new Error('Original error')
      })
      
      await app.startServer({ port: 0 })
      server = (app as any).server

      const response = await fetch(`http://localhost:${(server!.address() as any).port}/error`)
      
      // Should still return error response
      expect(response.status).toBe(500)
    })
  })
})

