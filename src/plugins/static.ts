/**
 * src/plugins/static.ts
 *
 * Static File Serving Plugin for Vegaa
 * --------------------------------------
 * Serves static files (HTML, CSS, JS, images, etc.) from a specified directory.
 *
 * Features:
 *  - Automatic MIME type detection
 *  - Security: prevents directory traversal
 *  - Cache control support
 *  - Configurable root directory
 */

import fs from 'fs/promises'
import path from 'path'
import type { Context, Handler } from '../core/types'

// Common MIME types
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
  '.pdf': 'application/pdf',
}

/**
 * Get MIME type based on file extension
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  return MIME_TYPES[ext] || 'application/octet-stream'
}

/**
 * Check if a path is safe (prevents directory traversal)
 */
function isSafePath(filePath: string, rootDir: string): boolean {
  const resolved = path.resolve(filePath)
  const resolvedRoot = path.resolve(rootDir)
  return resolved.startsWith(resolvedRoot)
}

/**
 * Static file serving middleware factory
 */
export function createStaticMiddleware(rootDir: string, options?: {
  prefix?: string
  indexFiles?: string[]
  cacheControl?: string
}): Handler {
  const { prefix = '', indexFiles = ['index.html', 'index.htm'], cacheControl = 'public, max-age=3600' } = options || {}

  return async function staticMiddleware(ctx: Context) {
    // Skip if already ended
    if (ctx._ended || ctx.res.writableEnded) return

    // Skip if path doesn't start with prefix
    if (prefix && !ctx.pathname.startsWith(prefix)) return

    // Remove prefix from pathname
    const filePath = prefix ? ctx.pathname.replace(prefix, '') : ctx.pathname
    const safePath = filePath || '/'

    try {
      // Build full file path
      let fullPath = path.join(rootDir, safePath)

      // Check for directory traversal
      if (!isSafePath(fullPath, rootDir)) {
        ctx.res.statusCode = 403
        ctx.res.setHeader('Content-Type', 'application/json')
        ctx.res.end(JSON.stringify({ error: 'Forbidden' }))
        ctx._ended = true
        return
      }

      // Check if it's a directory and try index files
      let stats = await fs.stat(fullPath).catch(() => null)
      
      if (stats?.isDirectory()) {
        for (const indexFile of indexFiles) {
          const indexPath = path.join(fullPath, indexFile)
          const indexStats = await fs.stat(indexPath).catch(() => null)
          if (indexStats?.isFile()) {
            fullPath = indexPath
            stats = indexStats
            break
          }
        }
      }

      // If still a directory or no stats, return 404
      if (!stats || !stats.isFile()) {
        // Not a file, let the route handler deal with it
        return
      }

      // Read and serve file
      const content = await fs.readFile(fullPath)
      const mimeType = getMimeType(fullPath)

      // Set headers
      if (ctx.res.status) {
        ctx.res.status(200)
      } else {
        ctx.res.statusCode = 200
      }
      ctx.res.setHeader('Content-Type', mimeType)
      ctx.res.setHeader('Content-Length', content.length.toString())
      if (cacheControl) {
        ctx.res.setHeader('Cache-Control', cacheControl)
      }

      // Send file
      ctx.res.end(content)
      ctx._ended = true
    } catch (err: any) {
      // File not found or error, let the route handler deal with it
      return
    }
  }
}

/**
 * Static file serving plugin
 */
export const staticPlugin = {
  name: 'static',
  version: '1.0.0',
  register(app: any, options?: { 
    root: string
    prefix?: string
    indexFiles?: string[]
    cacheControl?: string
  }) {
    if (!options?.root) {
      throw new Error('staticPlugin: root directory is required')
    }

    const middleware = createStaticMiddleware(options.root, {
      prefix: options.prefix,
      indexFiles: options.indexFiles,
      cacheControl: options.cacheControl,
    })

    app.middleware(middleware)
  },
}

