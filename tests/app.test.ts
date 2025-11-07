import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createApp } from '../src/core/app'
import http from 'http'

describe('App - Core Functionality', () => {
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

  describe('Route registration', () => {
    it('should register GET route', () => {
      app.route('/test').get(() => ({ message: 'test' }))
      // Route should be registered (we'll test via actual request)
    })

    it('should register POST route', () => {
      app.route('/test').post(() => ({ created: true }))
    })

    it('should register multiple methods on same path', () => {
      app.route('/test')
        .get(() => ({ method: 'GET' }))
        .post(() => ({ method: 'POST' }))
        .put(() => ({ method: 'PUT' }))
        .delete(() => ({ method: 'DELETE' }))
    })
  })

  describe('Middleware', () => {
    it('should register global middleware', () => {
      app.middleware(() => ({ user: { id: 1 } }))
      // Middleware should be registered
    })

    it('should register route-specific middleware', () => {
      app.route('/test')
        .middleware(() => ({ auth: true }))
        .get((auth) => ({ authenticated: auth }))
    })

    it('should chain multiple middlewares', () => {
      app.middleware([
        () => ({ step1: true }),
        (step1) => ({ step2: step1 }),
      ])
    })
  })

  describe('Request handling', () => {
    it('should handle simple GET request', async () => {
      app.route('/ping').get(() => ({ message: 'pong' }))
      
      await app.startServer({ port: 0 })
      server = (app as any).server

      const response = await fetch(`http://localhost:${(server!.address() as any).port}/ping`)
      const data = await response.json()

      expect(data).toEqual({ message: 'pong' })
    })

    it('should return 404 for non-existent route', async () => {
      await app.startServer({ port: 0 })
      server = (app as any).server

      const response = await fetch(`http://localhost:${(server!.address() as any).port}/nonexistent`)
      
      expect(response.status).toBe(404)
    })

    it('should handle route parameters', async () => {
      app.route('/users/:id').get((id) => ({ userId: id }))
      
      await app.startServer({ port: 0 })
      server = (app as any).server

      const response = await fetch(`http://localhost:${(server!.address() as any).port}/users/123`)
      const data = await response.json()

      expect(data).toEqual({ userId: '123' })
    })
  })

  describe('Context injection', () => {
    it('should inject middleware values', async () => {
      app.middleware(() => ({ user: { id: 1, name: 'Test' } }))
      app.route('/user').get((user) => ({ user }))
      
      await app.startServer({ port: 0 })
      server = (app as any).server

      const response = await fetch(`http://localhost:${(server!.address() as any).port}/user`)
      const data = await response.json()

      expect(data.user).toEqual({ id: 1, name: 'Test' })
    })

    it('should inject query parameters', async () => {
      app.route('/search').get((query) => ({ q: query.q }))
      
      await app.startServer({ port: 0 })
      server = (app as any).server

      const response = await fetch(`http://localhost:${(server!.address() as any).port}/search?q=test`)
      const data = await response.json()

      expect(data.q).toBe('test')
    })
  })

  describe('Error handling', () => {
    it('should handle route handler errors', async () => {
      app.route('/error').get(() => {
        throw new Error('Test error')
      })
      
      await app.startServer({ port: 0 })
      server = (app as any).server

      const response = await fetch(`http://localhost:${(server!.address() as any).port}/error`)
      
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Test error')
    })

    it('should call error handlers', async () => {
      let errorHandled = false
      app.onError(() => {
        errorHandled = true
      })
      
      app.route('/error').get(() => {
        throw new Error('Test error')
      })
      
      await app.startServer({ port: 0 })
      server = (app as any).server

      await fetch(`http://localhost:${(server!.address() as any).port}/error`)
      
      // Give error handler time to execute
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(errorHandled).toBe(true)
    })
  })

  describe('Lifecycle hooks', () => {
    it('should call onRequest hook', async () => {
      let hookCalled = false
      app.onRequest(() => {
        hookCalled = true
      })
      
      app.route('/test').get(() => ({ test: true }))
      
      await app.startServer({ port: 0 })
      server = (app as any).server

      await fetch(`http://localhost:${(server!.address() as any).port}/test`)
      
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(hookCalled).toBe(true)
    })

    it('should call onResponse hook', async () => {
      let responseData: any = null
      app.onResponse((ctx, data) => {
        responseData = data
      })
      
      app.route('/test').get(() => ({ test: true }))
      
      await app.startServer({ port: 0 })
      server = (app as any).server

      await fetch(`http://localhost:${(server!.address() as any).port}/test`)
      
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(responseData).toEqual({ test: true })
    })
  })
})

