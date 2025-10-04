import http from 'http'
import { URL } from 'url'
import { Context } from '../core/types'

/**
 * Reads raw request body as string.
 * Optimized for small payloads, uses minimal buffering.
 */
export async function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => resolve(body))
    req.on('error', (err) => reject(err))
  })
}

/**
 * Builds the request context (ctx) object used throughout VegaJS.
 * Contains req/res plus pre-parsed body, query, pathname, and helper methods.
 */
export async function buildContext(req: http.IncomingMessage, res: http.ServerResponse): Promise<Context> {
  const host = req.headers.host ?? 'localhost'
  const rawUrl = req.url ?? '/'
  const url = new URL(rawUrl, `http://${host}`)
  const pathname = url.pathname
  const query: Record<string, string> = {}
  url.searchParams.forEach((v, k) => (query[k] = v))

  // ----------------------------------------------------------------
  // 🔹 Response Helpers (optimized, no redundant checks)
  // ----------------------------------------------------------------
  // send() → generic helper
  ;(res as any).send = function (data: any) {
    if (res.writableEnded) return
    if (!res.headersSent) res.setHeader('Content-Type', 'application/json')
    const out = typeof data === 'string' ? data : JSON.stringify(data)
    res.end(out)
  }

  // json() → cleaner sugar over send()
  ;(res as any).json = function (data: any) {
    if (res.writableEnded) return
    if (!res.headersSent) res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(data))
  }

  // ----------------------------------------------------------------
  // 🔹 Parse body (if JSON and method != GET/HEAD)
  // ----------------------------------------------------------------
  let body: any = undefined
  const method = (req.method || 'GET').toUpperCase()
  const contentType = (req.headers['content-type'] || '') as string

  if (method !== 'GET' && method !== 'HEAD' && contentType.includes('application/json')) {
    try {
      const raw = await readBody(req)
      if (raw) {
        try {
          body = JSON.parse(raw)
        } catch {
          body = raw
        }
      }
    } catch {
      body = undefined
    }
  }

  // ----------------------------------------------------------------
  // 🔹 Build final context object
  // ----------------------------------------------------------------
  const ctx: Context = {
    req,
    res: res as Context['res'],
    body,
    query,
    params: {},
    pathname,
    user: undefined,
    _ended: false
  }

  return ctx
}