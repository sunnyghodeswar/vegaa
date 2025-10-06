/**
 * src/router/adapter.ts
 *
 * High-performance router adapter using find-my-way.
 * --------------------------------------------------
 * - Compiles and caches route patterns at registration time.
 * - Provides constant-time path matching with param extraction.
 * - Strictly typed wrapper around `find-my-way` to integrate with Vegaa’s Context system.
 *
 * Why adapter?
 * ------------
 * We isolate find-my-way behind a minimal adapter:
 * - Easier to replace internally (if we ever want custom trie or radix-tree routing).
 * - Keeps the rest of Vegaa decoupled and testable.
 *
 * Interview Note 💡:
 *  - We removed the fallback trie completely (used earlier in prototype).
 *  - find-my-way internally uses a radix tree with param tokenization,
 *    so it's faster and more memory-efficient than manual trie implementations.
 */

import FindMyWay, { HTTPVersion, HTTPMethod } from 'find-my-way'
import type { IncomingMessage, ServerResponse } from 'http'

/**
 * FindResult
 * Represents the outcome of a router match.
 */
export interface FindResult {
  handler?: (req: IncomingMessage, res: ServerResponse, params: Record<string, string>) => void
  params: Record<string, string>
  url?: string
}

/**
 * Router
 * Thin adapter over find-my-way.
 */
export class Router {
  private r: ReturnType<typeof FindMyWay>

  constructor() {
    // initialize find-my-way router with modern options
    this.r = FindMyWay<HTTPVersion.V1>({
      ignoreTrailingSlash: true,
      allowUnsafeRegex: false,
      defaultRoute: (_req, res) => {
        // No route matched — Vegaa handles this at App level, but we must end gracefully.
        if (!res.writableEnded) {
          res.statusCode = 404
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Not found (router default)' }))
        }
      }
    })
  }

  /**
   * Register a route handler for given HTTP method and path.
   * Note: the handler itself is usually a no-op in Vegaa,
   * since dispatching is centralized in App.handleRequest().
   */
  on(
    method: string,
    path: string,
    handler: (req: IncomingMessage, res: ServerResponse, params: Record<string, string>) => void
  ): void {
    // Ensure valid HTTPMethod union (find-my-way expects lowercase methods)
    const m = method.toUpperCase() as Uppercase<HTTPMethod>
    const validMethods: Uppercase<HTTPMethod>[] = [
      'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD', 'TRACE'
    ]

    if (!validMethods.includes(m)) {
      throw new Error(`Invalid HTTP method "${method}" for route ${path}`)
    }

    this.r.on(m as HTTPMethod, path, handler as any)
  }

  /**
   * Find a route and extract params for a given method+path.
   */
  find(method: string, path: string): FindResult {
    const m = method.toUpperCase() as Uppercase<HTTPMethod>
    const result = this.r.find(m as HTTPMethod, path)

    if (!result || typeof result.handler !== 'function') {
      return { params: {}, handler: undefined }
    }

    // Ensure params always contain string values
    const safeParams: Record<string, string> = {}
    for (const [key, val] of Object.entries(result.params || {})) {
      if (val !== undefined) safeParams[key] = String(val)
    }

    return {
      handler: result.handler as (req: IncomingMessage, res: ServerResponse, params: Record<string, string>) => void,
      params: safeParams,
      url: (result as any).path ?? undefined
    }
  }
}