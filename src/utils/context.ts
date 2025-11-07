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
import { makeRequest } from './makeRequest'
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
export function buildContext(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Context {
  // Optimized URL parsing (avoid URLSearchParams overhead when possible)
  const rawUrl = req.url || '/'
  let pathname = '/'
  let query: Record<string, string> = {}
  const qIndex = rawUrl.indexOf('?')
  if (qIndex === -1) {
    pathname = rawUrl
  } else {
    pathname = rawUrl.slice(0, qIndex)
    const search = rawUrl.slice(qIndex + 1)
    if (search.length > 0) {
      // Fast path: simple query strings without special encoding
      if (search.indexOf('%') === -1 && search.indexOf('+') === -1) {
        const pairs = search.split('&')
        const q: Record<string, string> = {}
        for (let i = 0; i < pairs.length; i++) {
          const pair = pairs[i]
          const eqIndex = pair.indexOf('=')
          if (eqIndex > 0) {
            q[pair.slice(0, eqIndex)] = pair.slice(eqIndex + 1)
          } else if (pair.length > 0) {
            q[pair] = ''
          }
        }
        query = q
      } else {
        // Fallback to URLSearchParams for encoded query strings
        const sp = new URLSearchParams(search)
        const q: Record<string, string> = {}
        sp.forEach((v, k) => (q[k] = v))
        query = q
      }
    }
  }

  const enhanced = res as EnhancedServerResponse

  // Response helpers (optimized: reuse function references to avoid per-request function creation)
  // Only attach if not already attached (reuse existing functions)
  if (!(enhanced as any)._vegaaEnhanced) {
    enhanced.status = function (code: number) {
      if (!this.writableEnded) this.statusCode = code
      return this
    }

    enhanced.type = function (mime: string) {
      if (!this.writableEnded && !this.headersSent) this.setHeader('Content-Type', mime)
      return this
    }
    ;(enhanced as any)._vegaaEnhanced = true
  }

  // Helper to clean up context reference when response ends
  const cleanupContextRef = (res: EnhancedServerResponse) => {
    const ctx = (res as any)._ctxRef as Context | undefined
    if (ctx) {
      ctx._ended = true
      // Clean up the reference to prevent memory leak
      delete (res as any)._ctxRef
    }
  }

  // Only attach helper functions if not already attached (reuse existing)
  if (!(enhanced as any)._vegaaHelpers) {
    enhanced.json = function (data: any) {
      if (this.writableEnded) return this
      if (!this.headersSent) this.setHeader('Content-Type', 'application/json')
      try {
        this.end(typeof data === 'string' ? data : JSON.stringify(data))
      } catch {
        try { this.end('{"error":"serialization failed"}') } catch {}
      }
      cleanupContextRef(this)
      return this
    }

    enhanced.send = function (data: any) {
      if (this.writableEnded) return this
      if (typeof data === 'object' && !Buffer.isBuffer(data) && data !== null) {
        if (!this.headersSent) this.setHeader('Content-Type', 'application/json')
        try {
          this.end(JSON.stringify(data))
        } catch {
          try { this.end('{"error":"serialization failed"}') } catch {}
        }
      } else {
        this.end(data)
      }
      cleanupContextRef(this)
      return this
    }

    enhanced.html = function (html: string) {
      if (this.writableEnded) return this
      if (!this.headersSent) this.setHeader('Content-Type', 'text/html; charset=utf-8')
      this.end(html)
      cleanupContextRef(this)
      return this
    }

    enhanced.text = function (text: string) {
      if (this.writableEnded) return this
      if (!this.headersSent) this.setHeader('Content-Type', 'text/plain; charset=utf-8')
      this.end(text)
      cleanupContextRef(this)
      return this
    }
    ;(enhanced as any)._vegaaHelpers = true
  }

  // Also clean up on response 'finish' event as a safety measure
  if (typeof enhanced.once === 'function') {
    enhanced.once('finish', function(this: typeof enhanced) {
      cleanupContextRef(this)
    })
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
    _ended: false,
    makeRequest
  }

  // backref for helper closures
  ;(enhanced as any)._ctxRef = ctx

  return ctx
}