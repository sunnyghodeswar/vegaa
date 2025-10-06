/**
 * buildContext.ts
 *
 * Builds a lightweight Context object for each request.
 * Attaches minimal response helpers (status/type/json/send) directly on res.
 *
 * Performance philosophy:
 *  - Avoid double-reading request streams.
 *  - Let the bodyParser middleware handle request bodies.
 *  - Context remains lightweight — only basic URL parsing & helpers.
 */

import http from 'http'
import { URL } from 'url'
import type { Context, EnhancedServerResponse } from '../core/types'

export async function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk: Buffer | string) => (body += chunk))
    req.on('end', () => resolve(body))
    req.on('error', (err) => reject(err))
  })
}

/**
 * Build per-request context.
 * Minimal parsing — no JSON parsing here (delegated to bodyParser middleware).
 */
export async function buildContext(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<Context> {
  const host = req.headers.host ?? 'localhost'
  const rawUrl = req.url ?? '/'
  const url = new URL(rawUrl, `http://${host}`)
  const pathname = url.pathname
  const query: Record<string, string> = {}
  url.searchParams.forEach((v, k) => (query[k] = v))

  const enhanced = res as EnhancedServerResponse

  // Response helpers
  enhanced.status = function (code: number) {
    if (!this.writableEnded) this.statusCode = code
    return this
  }

  enhanced.type = function (mime: string) {
    if (!this.writableEnded && !this.headersSent) this.setHeader('Content-Type', mime)
    return this
  }

  enhanced.json = function (data: any) {
    if (this.writableEnded) return this
    if (!this.headersSent) this.setHeader('Content-Type', 'application/json')
    try {
      this.end(typeof data === 'string' ? data : JSON.stringify(data))
    } catch {
      try { this.end('{"error":"serialization failed"}') } catch {}
    }
    const ctx = (this as any)._ctxRef as Context | undefined
    if (ctx) ctx._ended = true
    return this
  }

  enhanced.send = function (data: any) {
    if (this.writableEnded) return this
    if (typeof data === 'object' && !Buffer.isBuffer(data)) {
      if (!this.headersSent) this.setHeader('Content-Type', 'application/json')
      try {
        this.end(JSON.stringify(data))
      } catch {
        try { this.end('{"error":"serialization failed"}') } catch {}
      }
    } else {
      this.end(data)
    }
    const ctx = (this as any)._ctxRef as Context | undefined
    if (ctx) ctx._ended = true
    return this
  }

  /**
   * 🚫 Removed internal body parsing.
   * Let `bodyParser` plugin handle JSON, URL-encoded, and text bodies.
   */
  const ctx: Context = {
    req,
    res: enhanced,
    body: undefined, // will be set later by bodyParser
    query,
    params: {},
    pathname,
    user: undefined,
    _ended: false
  }

  // backref for helper closures
  ;(enhanced as any)._ctxRef = ctx

  return ctx
}