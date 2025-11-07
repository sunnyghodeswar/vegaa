import type { Handler } from '../core/types'

export type BodyParserOptions = { limit?: string | number }

/**
 * Parse size limit string/number to bytes
 */
function parseLimit(limit: string | number | undefined): number {
  if (!limit) return 1_000_000
  if (typeof limit === 'number') return limit
  const match = /^(\d+)(b|kb|mb)?$/i.exec(limit)
  if (!match) return 1_000_000
  const n = parseInt(match[1], 10)
  const unit = match[2]?.toLowerCase()
  switch (unit) {
    case 'kb': return n * 1024
    case 'mb': return n * 1024 * 1024
    default: return n
  }
}

/**
 * ⚡ Vegaa Body Parser Middleware
 * 
 * Features:
 * - Streams request body safely
 * - Enforces payload size limits
 * - Supports JSON, URL-encoded, and text bodies
 * - Auto-flattens body keys into context (no conflict with params)
 * - Proper error handling and cleanup
 */
export function bodyParser(opts?: BodyParserOptions): Handler {
  const limitBytes = parseLimit(opts?.limit)
  
  return async (ctx: any) => {
    const req = ctx.req
    const res = ctx.res
    const method = (req.method || 'GET').toUpperCase()

    // Skip GET/HEAD requests
    if (method === 'GET' || method === 'HEAD') {
      return
    }
    
    // Skip if body already parsed
    if (ctx.body !== undefined) {
      return
    }

    // Skip if no content-type header
    const contentType = (req.headers['content-type'] || '').toLowerCase()
    if (!contentType) {
      return
    }

    // Stream and parse request body
    try {
      const chunks: Buffer[] = []
      let totalSize = 0
      let hasError = false
      let error: Error | null = null

      // Create promise to handle async stream reading
      await new Promise<void>((resolve, reject) => {
        // Event handler cleanup function
        const cleanup = () => {
          if (typeof req.removeListener === 'function') {
            req.removeListener('data', onData)
            req.removeListener('end', onEnd)
            req.removeListener('error', onError)
          }
        }

        // Handle data chunks
        const onData = (chunk: Buffer) => {
          // Check payload size limit
          totalSize += chunk.length
          if (totalSize > limitBytes) {
            hasError = true
            error = new Error('Payload limit exceeded')
            cleanup()
            
            // Stop reading from stream
            if (typeof req.destroy === 'function') {
              req.destroy()
            }
            
            // Send error response if not already sent
            if (!res.writableEnded && !ctx._ended) {
              res.statusCode = 413
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ 
                error: `Payload too large (limit: ${limitBytes} bytes, received: ${totalSize} bytes)` 
              }))
              ctx._ended = true
            }
            
            // Reject promise to propagate error
            reject(error)
            return
          }
          
          // Accumulate chunk
          chunks.push(chunk)
        }

        // Handle stream end
        const onEnd = () => {
          cleanup()
          
          // Only resolve if no error occurred
          if (!hasError && !error) {
            resolve()
          }
          // If error occurred, promise should have already been rejected
        }

        // Handle stream errors
        const onError = (err: Error) => {
          hasError = true
          error = err
          cleanup()
          
          // Always reject on stream error
          reject(err)
        }

        // Register event listeners
        req.on('data', onData)
        req.on('end', onEnd)
        req.on('error', onError)
      })

      // If we reach here, stream completed successfully
      // Parse body based on content type
      const rawBuffer = Buffer.concat(chunks)
      const rawString = rawBuffer.toString('utf8')

      if (contentType.includes('application/json')) {
        try {
          ctx.body = rawString ? JSON.parse(rawString) : {}
        } catch (parseErr) {
          // Invalid JSON - send error response
          if (!res.writableEnded && !ctx._ended) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Invalid JSON' }))
            ctx._ended = true
          }
          throw parseErr
        }
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const params = new URLSearchParams(rawString)
        const data: Record<string, string> = {}
        params.forEach((v, k) => (data[k] = v))
        ctx.body = data
      } else if (contentType.includes('text/plain')) {
        ctx.body = rawString
      } else {
        ctx.body = rawBuffer
      }

      // Flatten body keys into context (safe - no conflict with reserved keys)
      if (ctx.body && typeof ctx.body === 'object' && !Buffer.isBuffer(ctx.body)) {
        for (const [key, val] of Object.entries(ctx.body)) {
          // Skip reserved context keys
          if (['req', 'res', 'params', '_ended', 'body'].includes(key)) {
            continue
          }
          // Only set if key doesn't already exist in context
          if (ctx[key] === undefined) {
            ctx[key] = val
          }
        }
      }
    } catch (err: any) {
      // Handle errors from stream reading or parsing
      
      // If response was already sent (e.g., payload limit exceeded),
      // just propagate the error
      if (ctx._ended || res.writableEnded) {
        throw err
      }
      
      // Otherwise, send error response
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Invalid request body' }))
      ctx._ended = true
      
      // Propagate error to error handlers
      throw err
    }
  }
}

export const bodyParserPlugin = {
  name: 'bodyParser',
  version: '2.0.0',
  register(app: any, opts?: BodyParserOptions) {
    app.middleware(bodyParser(opts))
  }
}
