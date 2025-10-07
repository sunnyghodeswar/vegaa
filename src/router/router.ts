// src/router/router.ts
/**
 * Router adapter for vegaa using find-my-way.
 * This file intentionally provides a small, typed wrapper
 * so the rest of the codebase doesn't directly depend on
 * the find-my-way types surface.
 */

import FindMyWay from 'find-my-way'
import type { IncomingMessage, ServerResponse } from 'http'

export type RawHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
) => void | Promise<void>

type HTTPMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'PATCH'
  | 'HEAD'
  | 'OPTIONS'

export class Router {
  private fw: any

  constructor() {
    // keep options minimal and fast
    this.fw = FindMyWay({
      ignoreTrailingSlash: true,
      defaultRoute: (_req: IncomingMessage, res: ServerResponse) => {
        if (!res.headersSent) res.setHeader('Content-Type', 'application/json')
        res.statusCode = 404
        res.end(JSON.stringify({ error: 'Not found' }))
      }
    })
  }

  /**
   * Register a route handler.
   * method: string will be normalized to uppercase and cast to HTTPMethod.
   */
  public on(method: string, path: string, handler: RawHandler, store?: any): void {
    const m = (method || 'GET').toUpperCase() as HTTPMethod
    // find-my-way expects uppercase method strings; handler receives (req,res,params)
    this.fw.on(
      m,
      path,
      { store },
      async (
        req: IncomingMessage,
        res: ServerResponse,
        params: Record<string, string> | undefined
      ) => {
        await Promise.resolve(handler(req, res, params ?? {}))
      }
    )
  }

  /**
   * Find a route. Returns object with `handler` (if present) and `params`.
   */
  public find(method: string, path: string): { handler: RawHandler | null; params: Record<string, string>; store?: any } {
    const m = (method || 'GET').toUpperCase() as HTTPMethod
    const found = this.fw.find(m, path)
    if (!found) return { handler: null, params: {} }
    // found.handler is wrapper we registered; we want to return a callable that matches RawHandler shape
    const fwHandler = found.handler as any
    const routeHandler: RawHandler = async (req, res, params) => {
      // Call the stored handler (it will be the wrapper we created in `on`)
      return await Promise.resolve(fwHandler(req, res, params))
    }
    return { handler: routeHandler, params: found.params ?? {}, store: (found as any).store }
  }

  public prettyPrint(): string {
    if (typeof this.fw.prettyPrint === 'function') return this.fw.prettyPrint()
    return ''
  }
}