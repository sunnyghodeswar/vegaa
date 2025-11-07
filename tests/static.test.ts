import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createStaticMiddleware } from '../src/plugins/static'
import { buildContext } from '../src/utils/context'
import http from 'http'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

describe('Static File Middleware', () => {
  let testDir: string
  let mockReq: http.IncomingMessage
  let mockRes: http.ServerResponse
  let ctx: any

  beforeEach(async () => {
    // Create temporary test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vegaa-test-'))
    
    // Create test files
    await fs.writeFile(path.join(testDir, 'test.txt'), 'test content')
    await fs.writeFile(path.join(testDir, 'index.html'), '<h1>Index</h1>')
    await fs.mkdir(path.join(testDir, 'subdir'))
    await fs.writeFile(path.join(testDir, 'subdir', 'file.txt'), 'subdir content')

    mockReq = {
      url: '/test.txt',
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
    } as any
  })

  afterEach(async () => {
    // Cleanup
    try {
      await fs.rm(testDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  describe('Basic file serving', () => {
    it('should serve file from root directory', async () => {
      const middleware = createStaticMiddleware(testDir)
      mockReq.url = '/test.txt'
      ctx = buildContext(mockReq, mockRes)
      ctx.pathname = '/test.txt'

      await middleware(ctx)

      expect(mockRes.statusCode).toBe(200)
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain')
      expect(mockRes.end).toHaveBeenCalledWith(Buffer.from('test content'))
      expect(ctx._ended).toBe(true)
    })

    it('should serve files from subdirectories', async () => {
      const middleware = createStaticMiddleware(testDir)
      mockReq.url = '/subdir/file.txt'
      ctx = buildContext(mockReq, mockRes)
      ctx.pathname = '/subdir/file.txt'

      await middleware(ctx)

      expect(mockRes.statusCode).toBe(200)
      expect(mockRes.end).toHaveBeenCalledWith(Buffer.from('subdir content'))
    })

    it('should serve index files for directories', async () => {
      const middleware = createStaticMiddleware(testDir, {
        indexFiles: ['index.html'],
      })
      mockReq.url = '/'
      ctx = buildContext(mockReq, mockRes)
      ctx.pathname = '/'

      await middleware(ctx)

      expect(mockRes.end).toHaveBeenCalledWith(Buffer.from('<h1>Index</h1>'))
    })
  })

  describe('Security - Directory traversal prevention', () => {
    it('should prevent directory traversal attacks', async () => {
      const middleware = createStaticMiddleware(testDir)
      mockReq.url = '/../../etc/passwd'
      ctx = buildContext(mockReq, mockRes)
      ctx.pathname = '/../../etc/passwd'

      await middleware(ctx)

      expect(mockRes.statusCode).toBe(403)
      expect(ctx._ended).toBe(true)
    })

    it('should prevent symlink traversal', async () => {
      // Create a symlink pointing outside
      const outsideDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vegaa-outside-'))
      const symlinkPath = path.join(testDir, 'symlink')
      
      try {
        await fs.symlink(outsideDir, symlinkPath)
        
        const middleware = createStaticMiddleware(testDir)
        mockReq.url = '/symlink'
        ctx = buildContext(mockReq, mockRes)
        ctx.pathname = '/symlink'

        await middleware(ctx)

        // Should reject symlink traversal
        expect(mockRes.statusCode).toBe(403)
      } finally {
        try {
          await fs.unlink(symlinkPath).catch(() => {})
          await fs.rm(outsideDir, { recursive: true, force: true }).catch(() => {})
        } catch {
          // Ignore cleanup errors
        }
      }
    })
  })

  describe('Prefix handling', () => {
    it('should serve files with prefix', async () => {
      const middleware = createStaticMiddleware(testDir, {
        prefix: '/assets',
      })
      mockReq.url = '/assets/test.txt'
      ctx = buildContext(mockReq, mockRes)
      ctx.pathname = '/assets/test.txt'

      await middleware(ctx)

      expect(mockRes.statusCode).toBe(200)
      expect(mockRes.end).toHaveBeenCalled()
    })

    it('should skip requests without prefix', async () => {
      const middleware = createStaticMiddleware(testDir, {
        prefix: '/assets',
      })
      mockReq.url = '/test.txt'
      ctx = buildContext(mockReq, mockRes)
      ctx.pathname = '/test.txt'

      await middleware(ctx)

      // Should not serve file
      expect(mockRes.end).not.toHaveBeenCalled()
      expect(ctx._ended).toBe(false)
    })
  })

  describe('Cache control', () => {
    it('should set cache control header', async () => {
      const middleware = createStaticMiddleware(testDir, {
        cacheControl: 'public, max-age=3600',
      })
      mockReq.url = '/test.txt'
      ctx = buildContext(mockReq, mockRes)
      ctx.pathname = '/test.txt'

      await middleware(ctx)

      expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=3600')
    })
  })

  describe('MIME type detection', () => {
    it('should detect correct MIME types', async () => {
      const middleware = createStaticMiddleware(testDir)
      
      // Test HTML
      mockReq.url = '/index.html'
      ctx = buildContext(mockReq, mockRes)
      ctx.pathname = '/index.html'
      await middleware(ctx)
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html')

      // Reset
      mockRes.setHeader = vi.fn()
      mockRes.end = vi.fn()
      ctx._ended = false

      // Test JSON
      await fs.writeFile(path.join(testDir, 'test.json'), '{}')
      mockReq.url = '/test.json'
      ctx.pathname = '/test.json'
      await middleware(ctx)
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json')
    })
  })

  describe('Error handling', () => {
    it('should handle non-existent files gracefully', async () => {
      const middleware = createStaticMiddleware(testDir)
      mockReq.url = '/nonexistent.txt'
      ctx = buildContext(mockReq, mockRes)
      ctx.pathname = '/nonexistent.txt'

      await middleware(ctx)

      // Should not send response, let route handler deal with it
      expect(mockRes.end).not.toHaveBeenCalled()
      expect(ctx._ended).toBe(false)
    })

    it('should skip if response already ended', async () => {
      const middleware = createStaticMiddleware(testDir)
      mockReq.url = '/test.txt'
      ctx = buildContext(mockReq, mockRes)
      ctx.pathname = '/test.txt'
      ctx._ended = true

      await middleware(ctx)

      expect(mockRes.end).not.toHaveBeenCalled()
    })
  })
})

