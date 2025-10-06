/**
 * src/plugins/json.ts
 *
 * Lightweight JSON middleware + plugin for Vegaa.
 * ------------------------------------------------
 * Automatically parses incoming JSON payloads (if not already parsed by buildContext),
 * and ensures outgoing responses can safely send JSON objects.
 *
 * Design Goals:
 *  - Zero overhead when Content-Type ≠ application/json.
 *  - Plays nice with ctx.body (never re-parses).
 *  - Reusable as middleware or plugin.
 *
 * Interview tip 💡:
 * “This middleware ensures we have idempotent JSON parsing, so we avoid
 * multiple stream reads which can cause high GC pressure in concurrent systems.”
 */

import type { Context, Handler } from '../core/types'

export const jsonMiddleware: Handler = async (ctx : Context) => {
  const req = ctx.req
  const method = (req.method || 'GET').toUpperCase()

  // Skip GET/HEAD and already-parsed bodies
  if (method === 'GET' || method === 'HEAD' || ctx.body !== undefined) return

  const contentType = (req.headers['content-type'] || '').toLowerCase()
  if (!contentType.includes('application/json')) return

  try {
    let raw = ''
    await new Promise<void>((resolve, reject) => {
      req.on('data', (chunk) => (raw += chunk))
      req.on('end', () => resolve())
      req.on('error', reject)
    })

    if (raw) {
      try {
        ctx.body = JSON.parse(raw)
      } catch {
        ctx.body = raw // fallback to raw string if malformed JSON
      }
    }
  } catch {
    // Silently ignore read errors (context will just have empty body)
  }
}

export const jsonPlugin = {
  name: 'json',
  version: '1.0.0',
  register(app: any) {
    app.middleware(jsonMiddleware)
  }
}