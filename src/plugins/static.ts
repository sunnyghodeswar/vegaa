/**
 * src/plugins/static.ts
 *
 * Static File Serving Plugin for Vegaa
 * --------------------------------------
 * Serves static files (HTML, CSS, JS, images, etc.) from a specified directory.
 *
 * Features:
 *  - Automatic MIME type detection
 *  - Security: prevents directory traversal and symlink attacks
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
 * Check if a file path is safe to serve (prevents directory traversal and symlink attacks)
 * 
 * Security approach:
 * 1. Resolve root directory to absolute path (resolves symlinks)
 * 2. Resolve file path relative to root directory
 * 3. Use path.relative() to verify file is within root
 * 4. If file exists, resolve its realpath and verify again (prevents symlink attacks)
 * 
 * @param filePath - The file path to check (can be absolute or relative)
 * @param rootDir - The root directory to serve files from
 * @returns true if the path is safe to serve, false otherwise
 */
async function isSafePath(filePath: string, rootDir: string): Promise<boolean> {
  try {
    // Step 1: Resolve root directory to absolute path (resolves symlinks)
    const realRoot = await fs.realpath(rootDir).catch(() => null)
    if (!realRoot) {
      // If we can't resolve root, it's unsafe
      return false
    }
    
    // Normalize root to ensure consistent comparison
    const absoluteRoot = path.resolve(realRoot)
    
    // Step 2: Get relative path from rootDir to filePath, then rebuild using realRoot
    // This ensures we're comparing paths that account for symlinks
    const normalizedRootDir = path.resolve(rootDir)
    const normalizedFilePath = path.resolve(filePath)
    
    // Get relative path from original root to file
    const relativeFromRoot = path.relative(normalizedRootDir, normalizedFilePath)
    
    // If relative path starts with '..' or is absolute, file is outside original root
    // This is the first safety check
    if (relativeFromRoot.startsWith('..') || path.isAbsolute(relativeFromRoot)) {
      return false
    }
    
    // Rebuild file path using realRoot (resolved symlinks)
    const absoluteFilePath = path.resolve(absoluteRoot, relativeFromRoot)
    
    // Step 3: Verify the rebuilt path is within realRoot using path.relative()
    const relative = path.relative(absoluteRoot, absoluteFilePath)
    
    // If relative path starts with '..' or is absolute, file is outside root
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      return false
    }
    
    // Step 4: If file exists, resolve its realpath to prevent symlink attacks
    // This ensures symlinks pointing outside root are rejected
    const realFilePath = await fs.realpath(absoluteFilePath).catch(() => null)
    
    if (realFilePath) {
      // File/directory exists - verify resolved path is still within root
      const normalizedRealPath = path.resolve(realFilePath)
      const realRelative = path.relative(absoluteRoot, normalizedRealPath)
      
      // If resolved path is outside root, it's a symlink attack
      if (realRelative.startsWith('..') || path.isAbsolute(realRelative)) {
        return false
      }
    }
    // If realpath failed (file doesn't exist), we trust the normalized path check above
    // (it's safe to check for non-existent files as long as path is within root)
    
    return true
  } catch (err) {
    // Any error during path resolution is considered unsafe
    if (process.env.NODE_ENV === 'development') {
      console.error('[Static] Path safety check error:', err)
    }
    return false
  }
}

/**
 * Static file serving middleware factory
 */
export function createStaticMiddleware(rootDir: string, options?: {
  prefix?: string
  indexFiles?: string[]
  cacheControl?: string
}): Handler {
  const { 
    prefix = '', 
    indexFiles = ['index.html', 'index.htm'], 
    cacheControl = 'public, max-age=3600' 
  } = options || {}

  return async function staticMiddleware(ctx: Context) {
    // Skip if response already ended
    if (ctx._ended || ctx.res.writableEnded) {
      return
    }

    // Skip if path doesn't start with prefix
    if (prefix && !ctx.pathname.startsWith(prefix)) {
      return
    }

    // Extract file path from URL pathname
    let filePath = prefix ? ctx.pathname.replace(prefix, '') : ctx.pathname
    
    // Normalize path: remove leading slashes and handle empty path
    filePath = filePath.replace(/^\/+/, '') || ''
    
    // If path is empty, treat as root directory
    if (!filePath) {
      filePath = '.'
    }

    try {
      // Build full file path by joining root directory with file path
      // This ensures we always work with absolute paths
      const fullPath = path.join(rootDir, filePath)

      // Security check: verify path is safe BEFORE checking if file exists
      // This prevents information leakage about file existence outside root
      const isSafe = await isSafePath(fullPath, rootDir)
      if (!isSafe) {
        ctx.res.statusCode = 403
        ctx.res.setHeader('Content-Type', 'application/json')
        ctx.res.end(JSON.stringify({ error: 'Forbidden' }))
        ctx._ended = true
        return
      }

      // Check if path exists and get stats
      let stats = await fs.stat(fullPath).catch(() => null)
      
      // If file doesn't exist, let route handler deal with it (404)
      // We already verified the path is safe above
      if (!stats) {
        return
      }
      
      // If it's a directory, try to serve index files
      if (stats.isDirectory()) {
        for (const indexFile of indexFiles) {
          const indexPath = path.join(fullPath, indexFile)
          
          // Verify index path is safe (should always be, but check anyway)
          const indexSafe = await isSafePath(indexPath, rootDir)
          if (!indexSafe) {
            continue
          }
          
          const indexStats = await fs.stat(indexPath).catch(() => null)
          if (indexStats?.isFile()) {
            // Found index file - serve it
            stats = indexStats
            filePath = path.join(filePath, indexFile)
            break
          }
        }
      }

      // If still a directory or not a file, let route handler deal with it
      if (!stats || !stats.isFile()) {
        return
      }

      // Read and serve file
      const finalPath = path.join(rootDir, filePath)
      const content = await fs.readFile(finalPath)
      const mimeType = getMimeType(finalPath)

      // Set response headers
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

      // Send file content
      ctx.res.end(content)
      ctx._ended = true
    } catch (err: any) {
      // Any error during file operations - let route handler deal with it
      // (could be permission errors, etc.)
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
