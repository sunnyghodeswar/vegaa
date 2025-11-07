import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createApp } from '../src/core/app'
import http from 'http'

describe('Graceful Shutdown', () => {
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
    // Clean up any shutdown handlers
    process.removeAllListeners('SIGTERM')
    process.removeAllListeners('SIGINT')
  })

  it('should have shutdown method', () => {
    expect(typeof app.shutdown).toBe('function')
  })

  it('should shutdown server gracefully', async () => {
    app.route('/test').get(() => ({ test: true }))
    
      await app.startServer({ port: 0 })
      server = (app as any).server

    expect(server).toBeDefined()
    
    await app.shutdown()
    
    // Server should be closed
    expect(server!.listening).toBe(false)
  })

  it('should handle shutdown when server not started', async () => {
    // Should not throw
    await expect(app.shutdown()).resolves.toBeUndefined()
  })

  it('should prevent multiple shutdowns', async () => {
    app.route('/test').get(() => ({ test: true }))
    
      await app.startServer({ port: 0 })
      server = (app as any).server

    await app.shutdown()
    await app.shutdown() // Second call should be safe
    
    expect(server!.listening).toBe(false)
  })
})

