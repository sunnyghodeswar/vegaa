import type { Handler } from '../core/types'

export type BodyParserOptions = { limit?: string | number }

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
 * ⚡ Body Parser Middleware (Production-grade)
 * - Safely streams incoming payloads
 * - Prevents blocking event loop
 * - Enforces max body size
 * - Supports JSON, URL-encoded, text, and binary
 * - No double parsing if ctx.body already exists
 */
export function bodyParser(opts?: BodyParserOptions): Handler {
  const limitBytes = parseLimit(opts?.limit)

  return async (ctx: any) => {
    const req = ctx.req
    const res = ctx.res
    const method = (req.method || 'GET').toUpperCase()

    if (method === 'GET' || method === 'HEAD') return
    if (ctx.body !== undefined) return

    const contentType = (req.headers['content-type'] || '').toLowerCase()
    if (!contentType) return

    try {
      const chunks: Buffer[] = []
      let size = 0

      await new Promise<void>((resolve, reject) => {
        req.on('data', (chunk: Buffer) => {
          size += chunk.length
          if (size > limitBytes) {
            req.destroy()
            if (!res.writableEnded) {
              res.statusCode = 413
              res.end(JSON.stringify({ error: `Payload too large (${limitBytes} bytes)` }))
            }
            ctx._ended = true
            reject(new Error('Payload limit exceeded'))
            return
          }
          chunks.push(chunk)
        })
        req.on('end', () => resolve())
        req.on('error', reject)
      })

      if (ctx._ended) return

      const rawBuffer = Buffer.concat(chunks)
      const rawString = rawBuffer.toString('utf8')

      if (contentType.includes('application/json')) {
        try {
          ctx.body = rawString ? JSON.parse(rawString) : {}
        } catch {
          ctx.body = {}
        }
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const params = new URLSearchParams(rawString)
        const data: Record<string, string> = {}
        params.forEach((v, k) => (data[k] = v))
        ctx.body = data
      } else if (contentType.includes('text/plain')) {
        ctx.body = rawString
      } else if (contentType.includes('application/octet-stream')) {
        ctx.body = rawBuffer
      } else {
        ctx.body = rawBuffer
      }
    } catch (err: any) {
      if (!ctx._ended && !res.writableEnded) {
        res.statusCode = 400
        res.end(JSON.stringify({ error: 'Invalid request body' }))
        ctx._ended = true
      }
    }
  }
}

/**
 * ✅ Vegaa Body Parser Plugin
 * - Automatically adds the middleware globally
 * - Configurable via options (limit)
 */
export const bodyParserPlugin = {
  name: 'bodyParser',
  version: '1.0.0',
  register(app: any, opts?: BodyParserOptions) {
    app.middleware(bodyParser(opts))
  }
}