/**
 * src/core/expressCompat.ts
 *
 * Express Middleware Compatibility Layer for Vegaa
 * ------------------------------------------------
 * Enables Express middleware to work with Vegaa while preserving Vegaa's minimal API.
 * 
 * Usage:
 *   vegaa.useExpressMiddleware(helmet())
 *   vegaa.useExpressMiddleware('/api', cors())
 * 
 * This keeps Vegaa's DNA intact - minimalism and context integration.
 */

import type { App } from './app'
import type { Context } from './types'

/**
 * Express middleware signature: (req, res, next) => void
 */
type ExpressMiddleware = (req: any, res: any, next: (err?: any) => void) => void | Promise<void>

/**
 * Express error middleware signature: (err, req, res, next) => void
 */
type ExpressErrorMiddleware = (err: any, req: any, res: any, next: (err?: any) => void) => void | Promise<void>

/**
 * Check if a function is Express error middleware (4 parameters)
 */
function isExpressErrorMiddleware(fn: Function): boolean {
  return fn.length === 4
}

/**
 * Sync Express req properties to Vegaa context
 */
function syncReqToContext(ctx: Context, req: any): Context {
  // Copy common Express properties
  const props = ['body', 'params', 'query', 'user', 'session', 'cookies']
  for (const prop of props) {
    if (req[prop] !== undefined && ctx[prop] === undefined) {
      ctx[prop] = req[prop]
    }
  }
  return ctx
}

/**
 * Sync Vegaa context properties to Express req
 */
function syncContextToReq(ctx: Context, req: any): void {
  if (ctx.body !== undefined) req.body = ctx.body
  if (ctx.params) req.params = ctx.params
  if (ctx.query) req.query = ctx.query
  if (ctx.user !== undefined) req.user = ctx.user
}

/**
 * Wrap Express middleware to work with Vegaa context
 */
function wrapExpressMiddleware(fn: ExpressMiddleware, app: App): (ctx: Context) => Promise<void> {
  return async (ctx: Context) => {
    const req = ctx.req
    const res = ctx.res

    // Sync context to req before middleware runs
    syncContextToReq(ctx, req)

    // Track if next() was called
    let nextCalled = false
    let resolved = false

    // Store original res.end to detect response completion
    const originalEnd = res.end.bind(res)
    let cleanupDone = false
    let timeoutId: NodeJS.Timeout | null = null

    // Cleanup function to restore original end
    const cleanup = () => {
      if (cleanupDone) return
      cleanupDone = true
      res.end = originalEnd
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    }

    // Override res.end to detect response completion
    res.end = function (chunk?: any, encoding?: any, cb?: any) {
      originalEnd.call(this, chunk, encoding, cb)
      if (!resolved && !nextCalled) {
        // Response ended, sync back to context
        const injected = syncReqToContext(ctx, req)
        resolved = true
        cleanup()
      }
    }

    // Event-based response monitoring
    const onFinish = () => {
      if (!resolved && !nextCalled) {
        const injected = syncReqToContext(ctx, req)
        resolved = true
        cleanup()
      }
    }

    const onClose = () => {
      if (!resolved && !nextCalled) {
        const injected = syncReqToContext(ctx, req)
        resolved = true
        cleanup()
      }
    }

    res.once('finish', onFinish)
    res.once('close', onClose)

    // Express next() function
    const next = (err?: any) => {
      if (nextCalled) return
      nextCalled = true
      cleanup()

      if (err) {
        // Error occurred, sync and throw
        syncReqToContext(ctx, req)
        throw err instanceof Error ? err : new Error(String(err))
      }

      // Success path - sync properties back to context
      syncReqToContext(ctx, req)
    }

    try {
      // Call Express middleware
      const result = Promise.resolve(fn(req, res, next))

      // Handle async middleware
      result
        .then(() => {
          cleanup()
          if (!resolved && !nextCalled) {
            // Middleware didn't call next() or end response
            // Use setTimeout as fallback to check response status
            timeoutId = setTimeout(() => {
              if (!resolved && !nextCalled) {
                const injected = syncReqToContext(ctx, req)
                resolved = true
                cleanup()
              }
            }, 10)
          }
        })
        .catch((err: any) => {
          cleanup()
          if (!resolved && !nextCalled) {
            syncReqToContext(ctx, req)
            throw err instanceof Error ? err : new Error(String(err))
          }
        })
    } catch (err: any) {
      cleanup()
      if (!nextCalled) {
        syncReqToContext(ctx, req)
        throw err instanceof Error ? err : new Error(String(err))
      }
    }
  }
}

/**
 * Wrap Express error middleware
 */
function wrapExpressErrorMiddleware(
  fn: ExpressErrorMiddleware,
  app: App
): (ctx: Context, err: Error) => Promise<void> {
  return async (ctx: Context, err: Error) => {
    const req = ctx.req
    const res = ctx.res

    syncContextToReq(ctx, req)

    let nextCalled = false
    const next = (error?: any) => {
      if (nextCalled) return
      nextCalled = true
      if (error) {
        throw error instanceof Error ? error : new Error(String(error))
      }
    }

    try {
      await Promise.resolve(fn(err, req, res, next))
      syncReqToContext(ctx, req)
    } catch (error: any) {
      syncReqToContext(ctx, req)
      throw error instanceof Error ? error : new Error(String(error))
    }
  }
}

/**
 * Add useExpressMiddleware method to App
 * This preserves Vegaa's minimal API while allowing Express middleware usage
 */
export function enableExpressCompat(app: App): void {
  /**
   * Use Express middleware with Vegaa
   * 
   * @param pathOrMiddleware - Path prefix (optional) or Express middleware function
   * @param middleware - Express middleware function (if path provided)
   * 
   * Examples:
   *   vegaa.useExpressMiddleware(helmet())
   *   vegaa.useExpressMiddleware('/api', cors())
   *   vegaa.useExpressMiddleware((err, req, res, next) => { ... }) // Error handler
   */
  ;(app as any).useExpressMiddleware = function (
    pathOrMiddleware: string | ExpressMiddleware | ExpressErrorMiddleware,
    middleware?: ExpressMiddleware
  ): App {
    if (typeof pathOrMiddleware === 'function') {
      // Single middleware: useExpressMiddleware(middleware)
      const fn = pathOrMiddleware
      
      if (isExpressErrorMiddleware(fn)) {
        // Express error handler (4 parameters)
        const errorHandler = wrapExpressErrorMiddleware(fn as ExpressErrorMiddleware, app)
        app.onError(async (ctx: Context, err: Error) => {
          await errorHandler(ctx, err)
        })
        return app
      }
      
      // Regular Express middleware (3 parameters)
      app.middleware(wrapExpressMiddleware(fn as ExpressMiddleware, app))
      return app
    } else {
      // Path + middleware: useExpressMiddleware('/path', middleware)
      const path = pathOrMiddleware as string
      const fn = middleware!
      
      if (isExpressErrorMiddleware(fn)) {
        // Path-specific error handler
        const errorHandler = wrapExpressErrorMiddleware(fn as ExpressErrorMiddleware, app)
        app.onError(async (ctx: Context, err: Error) => {
          if (ctx.pathname.startsWith(path)) {
            await errorHandler(ctx, err)
          }
        })
        return app
      }
      
      // Path-specific middleware
      app.middleware(async (ctx: Context) => {
        if (ctx.pathname.startsWith(path)) {
          await wrapExpressMiddleware(fn, app)(ctx)
        }
      })
      return app
    }
  }
}

