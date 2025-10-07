/**
 * src/core/app.ts
 *
 * VegaJS — Core App Implementation (strict + production ready)
 *
 * - Uses Node’s stable `http` for ingress.
 * - Uses `find-my-way` via Router adapter for ultra-fast routing.
 * - Supports global & route-level middleware.
 * - Context-based handler execution.
 * - Optional cache, plugin, and cluster support.
 * - Sugar method `.startVegaaServer()` for clean startup syntax.
 */

import http from 'http'
import os from 'os'
import cluster from 'cluster'
import type { AddressInfo } from 'net'
import { RouteBuilder } from './routeBuilder'
import type { Handler, Context, Route, MiddlewareEntry } from './types'
import { isPlugin } from './plugins'
import { buildContext } from '../utils/context'
import { Semaphore } from '../utils/semaphore'
import { cacheGetOrSet } from '../utils/cache'
import { extractParamNames, compileArgBuilder } from '../utils/params'
import { Router } from '../router/adapter'
import { findAvailablePort } from '../utils/port';  

export class App {
  private routerMap = new Map<string, Router>()
  private globalMiddlewares: MiddlewareEntry[] = []
  private hooks = {
    onRequest: [] as Array<(ctx: Context) => Promise<void> | void>,
    onResponse: [] as Array<(ctx: Context, data: any) => Promise<void> | void>,
    onError: [] as Array<(ctx: Context, err: Error) => Promise<void> | void>
  }

  private routeRegistry = new Map<string, Route>()

  constructor(public opts: Record<string, any> = {}) {}

  // -------------------------------
  // ROUTE BUILDERS
  // -------------------------------
  public route(path: string): RouteBuilder {
    return new RouteBuilder(this, path)
  }
  public call(path: string): RouteBuilder {
    return this.route(path)
  }

  // -------------------------------
  // GLOBAL MIDDLEWARE
  // -------------------------------
  public middleware(mw: Handler | Handler[]): this {
    const addOne = (fn: Handler) => {
      if (typeof fn !== 'function') throw new TypeError('middleware expects a function')
      const names = extractParamNames(fn as Function)
      const builder = names.length ? compileArgBuilder(names) : undefined
      this.globalMiddlewares.push({ fn, paramNames: names, argBuilder: builder })
    }

    if (Array.isArray(mw)) mw.forEach(addOne)
    else addOne(mw)

    return this
  }

  // -------------------------------
  // PLUGINS
  // -------------------------------
  public async plugin(plugin: { register: (app: App, opts?: Record<string, any>) => any }, opts?: Record<string, any>): Promise<this> {
    if (!isPlugin(plugin)) throw new TypeError('plugin() expects an object with register(app)')
    await plugin.register(this, opts)
    return this
  }

  // -------------------------------
  // DECORATORS
  // -------------------------------
public decorate<K extends string, V>(key: K, value: V): void {
  if (!key || typeof key !== 'string') throw new TypeError('decorate requires string key')

  // safely cast `this` to any only for assignment
  const self = this as unknown as Record<string, unknown>

  if (key in self)
    throw new Error(`Property "${key}" already exists on app`)

  self[key] = value
}

  // -------------------------------
  // ROUTE REGISTRATION
  // -------------------------------
  public registerRoute(method: string, path: string, handler: Handler, mws: Handler[], cfg: Record<string, any> | null): void {
    const methodKey = (method || 'GET').toUpperCase()
    let router = this.routerMap.get(methodKey)
    if (!router) {
      router = new Router()
      this.routerMap.set(methodKey, router)
    }

    const routeMws: MiddlewareEntry[] = []
    for (const fn of mws) {
      const names = extractParamNames(fn as Function)
      const builder = names.length ? compileArgBuilder(names) : undefined
      routeMws.push({ fn, paramNames: names, argBuilder: builder })
    }

    const paramNames = extractParamNames(handler as Function)
    const argBuilder = paramNames.length ? compileArgBuilder(paramNames) : undefined

    const route: Route = {
      method: methodKey,
      path,
      handler,
      mws: routeMws,
      cfg,
      paramNames,
      argBuilder
    }

    const key = `${methodKey} ${path}`
    this.routeRegistry.set(key, route)
    router.on(methodKey, path, () => {}) // precompile path pattern
  }

  // -------------------------------
  // ROUTE LOOKUP
  // -------------------------------
  private getRoute(method: string, pathname: string): { route: Route | null; params: Record<string, string> } {
    const m = (method || 'GET').toUpperCase()
    const router = this.routerMap.get(m)
    if (!router) return { route: null, params: {} }

    const found = router.find(m, pathname)
    if (!found.handler) return { route: null, params: found.params ?? {} }

    for (const [k, route] of this.routeRegistry.entries()) {
      const [rk, rp] = k.split(' ', 2)
      if (rk !== m) continue
      if (rp === pathname) return { route, params: found.params ?? {} }
      if (rp.includes(':') || rp.includes('*')) {
        const regex = new RegExp('^' + rp.replace(/\*/g, '(.*)').replace(/:([^/]+)/g, '([^/]+)') + '$')
        if (regex.test(pathname)) return { route, params: found.params ?? {} }
      }
    }

    return { route: null, params: found.params ?? {} }
  }

   /**
   * Executes middleware entries sequentially.
   * 
   * ✅ Each middleware receives auto-injected args (based on param names)
   * ✅ If it returns a plain object, its keys are merged into ctx
   * ✅ Non-object returns are ignored (with optional dev warning)
   * ✅ Chainable and context-aware: later middlewares see earlier merged data
   */
  private async runMiddlewares(list: MiddlewareEntry[], ctx: Context): Promise<void> {
    for (const entry of list) {
      if (ctx._ended || ctx.res.writableEnded) return

      // 🧩 Build argument list dynamically based on param names (body, user, query, etc.)
      const args = entry.argBuilder ? entry.argBuilder(ctx) : [ctx]

      let result: any
      try {
        result = await Promise.resolve((entry.fn as any)(...args))
      } catch (err) {
        console.error('⚠️ Middleware threw an error:', err)
        throw err
      }

      // 🧱 Merge returned plain objects into ctx
      if (result && typeof result === 'object' && !Array.isArray(result)) {
        for (const key of Object.keys(result)) {
          if (key === 'req' || key === 'res' || key === '_ended') continue
          (ctx as any)[key] = result[key]
        }
      } else if (result !== undefined && process.env.NODE_ENV !== 'production') {
        // 🧃 Helpful dev warning for accidental non-object returns
        console.warn(
          `⚠️ Vegaa middleware ignored non-object return (${typeof result}). ` +
          `If you meant to return an object, wrap it like: () => ({ foo: "bar" })`
        )
      }

      if (ctx._ended || ctx.res.writableEnded) return
    }
  }
  // -------------------------------
  // REQUEST HANDLER
  // -------------------------------
  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const ctx = await buildContext(req, res)
    let responsePayload: any = null
    const method = (ctx.req.method || 'GET').toUpperCase()
    const pathname = ctx.pathname

    try {
      for (const hook of this.hooks.onRequest) await hook(ctx)
      if (ctx._ended) return

      await this.runMiddlewares(this.globalMiddlewares, ctx)
      if (ctx._ended) return

      const { route, params } = this.getRoute(method, pathname)
      if (!route) {
        res.statusCode = 404
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: `Route ${method} ${pathname} not found` }))
        return
      }

      ctx.params = params
      await this.runMiddlewares(route.mws, ctx)
      if (ctx._ended) return

      responsePayload = route.argBuilder
        ? await (route.handler as any)(...route.argBuilder(ctx))
        : await (route.handler as any)(ctx)

      if (route.cfg?.cacheTTL) {
        const key = `${route.method}:${route.path}:${JSON.stringify(ctx.query)}`
        responsePayload = await cacheGetOrSet(key, route.cfg.cacheTTL, async () => {
          return route.argBuilder
            ? await (route.handler as any)(...route.argBuilder!(ctx))
            : await (route.handler as any)(ctx)
        })
      }

      for (const hook of this.hooks.onResponse) await hook(ctx, responsePayload)

      if (!ctx._ended && !res.writableEnded) {
        res.statusCode = res.statusCode || 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(responsePayload ?? null))
        ctx._ended = true
      }
    } catch (err: any) {
      const e = err instanceof Error ? err : new Error(String(err))
      for (const hook of this.hooks.onError) await hook(ctx, e)
      if (!res.headersSent) res.setHeader('Content-Type', 'application/json')
      res.statusCode = 500
      res.end(JSON.stringify({ error: e.message }))
      ctx._ended = true
    }
  }

  // -------------------------------
  // SERVER STARTUP
  // -------------------------------
public async startServer({ port, maxConcurrency = 100 }: { port?: number; maxConcurrency?: number } = {}): Promise<void> {
  if (cluster.isPrimary && process.env.CLUSTER === 'true') {
    const cpus = Math.max(1, os.cpus().length)
    const resolvedPort = await findAvailablePort(port ?? 3000)
    process.env.VEGAA_PORT = String(resolvedPort)

    for (let i = 0; i < cpus; i++) {
      cluster.fork({ VEGAA_PORT: process.env.VEGAA_PORT })
    }

    cluster.on('exit', (w) => {
      console.warn(`💀 Worker ${w.process.pid} died — restarting...`)
      cluster.fork({ VEGAA_PORT: process.env.VEGAA_PORT })
    })

    console.log(`🔁 Cluster master bound to port ${resolvedPort}`)
    return
  }

  // Single-process mode
  const resolvedPort = await findAvailablePort(port ?? 3000)
  const sem = new Semaphore(Math.max(1, maxConcurrency))

  const server = http.createServer(async (req, res) => {
    await sem.acquire()
    try {
      await this.handleRequest(req, res)
    } finally {
      sem.release()
    }
  })

  await new Promise<void>((resolve, reject) => {
    server.on('error', reject)
    server.listen(resolvedPort, () => {
      const addr = server.address() as AddressInfo | null
      console.log(`🚀 VegaaJS listening on port ${addr?.port ?? resolvedPort} (pid ${process.pid})`)
      resolve()
    })
  })
}

  // -------------------------------
  // HOOKS
  // -------------------------------
  public onRequest(fn: (ctx: Context) => Promise<void> | void) {
    this.hooks.onRequest.push(fn)
  }
  public onResponse(fn: (ctx: Context, data: any) => Promise<void> | void) {
    this.hooks.onResponse.push(fn)
  }
  public onError(fn: (ctx: Context, err: Error) => Promise<void> | void) {
    this.hooks.onError.push(fn)
  }
}

/**
 * Factory — returns callable app instance with .startVegaaServer()
 */
export function createApp(opts?: Record<string, any>) {
  const app = new App(opts)
  const callable = ((path: string) => app.call(path)) as App & ((path: string) => RouteBuilder) & {
    startVegaaServer: (opts?: { port?: number; maxConcurrency?: number }) => Promise<void>
  }

  Object.setPrototypeOf(callable, App.prototype)
  Object.assign(callable, app)

  callable.startVegaaServer = async function (opts?: { port?: number; maxConcurrency?: number }) {
    return app.startServer(opts)
  }

  return callable
}