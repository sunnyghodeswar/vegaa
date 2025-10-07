// src/core/app.ts
/**
 * Vegaa — Core App (optimized, production-minded)
 *
 * - Direct route dispatch via Router adapter
 * - Optional fast-json-stringify per-route serializer
 * - Tuned keepAlive & headersTimeout
 * - Cluster support (master forks; workers listen on same port)
 * - Lightweight middleware chain with param auto-injection + object merge
 */

import http from 'http'
import os from 'os'
import cluster from 'cluster'
import type { AddressInfo } from 'net'
import type { IncomingMessage, ServerResponse } from 'http'
import { RouteBuilder } from './routeBuilder'
import type { Handler, Context, Route, MiddlewareEntry } from './types'
import { isPlugin } from './plugins'
import { buildContext } from '../utils/context'
import { Semaphore } from '../utils/semaphore'
import { cacheGetOrSet } from '../utils/cache'
import { extractParamNames, compileArgBuilder } from '../utils/params'
import { Router } from '../router/adapter'
import { findAvailablePort } from '../utils/port'
import buildSerializer from 'fast-json-stringify'

/**
 * App - main application class
 */
export class App {
  // per-method router (fast path)
  private routerMap = new Map<string, Router>()

  // compiled global middlewares
  private globalMiddlewares: MiddlewareEntry[] = []

  // hooks
  private hooks = {
    onRequest: [] as Array<(ctx: Context) => Promise<void> | void>,
    onResponse: [] as Array<(ctx: Context, data: any) => Promise<void> | void>,
    onError: [] as Array<(ctx: Context, err: Error) => Promise<void> | void>
  }

  constructor(public opts: Record<string, any> = {}) {}

  // ---------------------------
  // route factory
  // ---------------------------
  public route(path: string): RouteBuilder {
    return new RouteBuilder(this, path)
  }
  public call(path: string): RouteBuilder {
    return this.route(path)
  }

  // ---------------------------
  // middleware registration
  // ---------------------------
  public middleware(mw: Handler | Handler[]): this {
    const addOne = (fn: Handler) => {
      if (typeof fn !== 'function') throw new TypeError('middleware expects a function')
      const names = extractParamNames(fn as Function)
      const builder = names.length ? compileArgBuilder(names) : undefined
      this.globalMiddlewares.push({ fn, paramNames: names, argBuilder: builder })
    }
    if (Array.isArray(mw)) for (const fn of mw) addOne(fn)
    else addOne(mw)
    return this
  }

  // ---------------------------
  // plugin registration
  // ---------------------------
  public async plugin(plugin: any, opts?: Record<string, any>): Promise<this> {
    if (!isPlugin(plugin)) throw new TypeError('plugin() expects object with register(app)')
    await plugin.register(this, opts)
    return this
  }

  // ---------------------------
  // decorate helper
  // ---------------------------
  public decorate<K extends string, V>(key: K, value: V): asserts this is this & Record<K, V> {
    if (!key || typeof key !== 'string') throw new TypeError('decorate requires string key')
    const self = this as unknown as Record<string, unknown>
    if (key in self) throw new Error(`Property "${key}" already exists on app`)
    self[key] = value
  }

  // ---------------------------
  // registerRoute - called by RouteBuilder
  // ---------------------------
  public registerRoute(
    method: string,
    path: string,
    handler: Handler,
    mws: Handler[],
    cfg: Record<string, any> | null
  ): void {
    const methodKey = (method || 'GET').toUpperCase()
    let router = this.routerMap.get(methodKey)
    if (!router) {
      router = new Router()
      this.routerMap.set(methodKey, router)
    }

    // compile route-level middleware entries once
    const routeMws: MiddlewareEntry[] = []
    for (const fn of mws) {
      const names = extractParamNames(fn as Function)
      const builder = names.length ? compileArgBuilder(names) : undefined
      routeMws.push({ fn, paramNames: names, argBuilder: builder })
    }

    // compile handler arg builder once
    const paramNames = extractParamNames(handler as Function)
    const argBuilder = paramNames.length ? compileArgBuilder(paramNames) : undefined

    // compiled serializer (if schema present)
    const serializer = cfg?.schema ? buildSerializer(cfg.schema) : undefined

    const route: Route = {
      method: methodKey,
      path,
      handler,
      mws: routeMws,
      cfg,
      paramNames,
      argBuilder,
      // allow undefined serializer; Route type should permit undefined|null
      serializer: serializer as any
    }

    // Register with router using adapter signature (method, path, store, handler)
    // Use a no-op handler; central dispatch happens in handleRequest.
    router.on(methodKey, path, { route } as any, () => {})
  }

  // ---------------------------
  // getRoute - direct dispatch via router.find() store
  // ---------------------------
  private getRoute(method: string, pathname: string): { route: Route | null; params: Record<string, string> } {
    const m = (method || 'GET').toUpperCase()
    const router = this.routerMap.get(m)
    if (!router) return { route: null, params: {} }

    const found: any = router.find(m, pathname)
    if (!found || !found.handler) return { route: null, params: found?.params ?? {} }

    // find-my-way returns `store` if we passed one at registration.
    // we expect store.route to be the Route object we put there.
    const route = found.store?.route as Route | undefined
    return { route: route ?? null, params: found.params ?? {} }
  }

  // ---------------------------
  // runMiddlewares - sequential, auto-inject + object merge
  // ---------------------------
  private async runMiddlewares(list: MiddlewareEntry[], ctx: Context): Promise<void> {
    const isThenable = (v: any): v is Promise<unknown> => !!v && typeof v.then === 'function'
    for (const entry of list) {
      if (ctx._ended || ctx.res.writableEnded) return

      const args = entry.argBuilder ? entry.argBuilder(ctx) : [ctx]

      try {
        const maybe = (entry.fn as any)(...args)
        const result = isThenable(maybe) ? await maybe : maybe

        // merge plain-object returns into ctx
        if (result && typeof result === 'object' && !Array.isArray(result)) {
          for (const key of Object.keys(result)) {
            if (key === 'req' || key === 'res' || key === '_ended') continue
            ;(ctx as any)[key] = (result as any)[key]
          }
        } else if (result !== undefined && process.env.NODE_ENV !== 'production') {
          // helpful dev warning (non-breaking)
          console.warn(`Vegaa middleware returned non-object (${typeof result}) — ignored.`)
        }
      } catch (err) {
        // bubble and allow onError hooks to run in handleRequest
        throw err
      }

      if (ctx._ended || ctx.res.writableEnded) return
    }
  }

  // ---------------------------
  // central request dispatcher
  // ---------------------------
  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const ctx = buildContext(req, res)
    let responsePayload: any = null
    const method = (ctx.req.method || 'GET').toUpperCase()
    const pathname = ctx.pathname

    const isThenable = (v: any): v is Promise<unknown> => !!v && typeof v.then === 'function'
    try {
      // onRequest hooks
      for (const h of this.hooks.onRequest) {
        const maybe = h(ctx)
        if (isThenable(maybe)) await maybe
      }
      if (ctx._ended) return

      // global middleware
      await this.runMiddlewares(this.globalMiddlewares, ctx)
      if (ctx._ended) return

      // route lookup (fast)
      const { route, params } = this.getRoute(method, pathname)
      if (!route) {
        if (!res.headersSent) res.setHeader('Content-Type', 'application/json')
        res.statusCode = 404
        res.end(JSON.stringify({ error: `Route ${method} ${pathname} not found` }))
        ctx._ended = true
        return
      }

      // attach params
      ctx.params = params

      // route-level middleware
      await this.runMiddlewares(route.mws, ctx)
      if (ctx._ended) return

      // caching support — perform lookup BEFORE executing handler to avoid duplicate work
      const shouldCache = !!route.cfg?.cacheTTL
      if (shouldCache) {
        const key = `${route.method}:${route.path}:${JSON.stringify(ctx.query)}`
        responsePayload = await cacheGetOrSet(key, route.cfg!.cacheTTL, async () => {
          if (route.argBuilder) return await (route.handler as any)(...route.argBuilder!(ctx))
          return await (route.handler as any)(ctx)
        })
      } else {
        // handler invocation with compiled arg builder if available
        if (route.argBuilder) {
          const args = route.argBuilder(ctx)
          const maybe = (route.handler as any)(...args)
          responsePayload = isThenable(maybe) ? await maybe : maybe
        } else {
          const maybe = (route.handler as any)(ctx)
          responsePayload = isThenable(maybe) ? await maybe : maybe
        }
      }

      // onResponse hooks
      for (const h of this.hooks.onResponse) {
        const maybe = h(ctx, responsePayload)
        if (isThenable(maybe)) await maybe
      }

      // final send
      if (!ctx._ended && !res.writableEnded) {
        res.statusCode = res.statusCode || 200
        // use precompiled serializer if available
        if (route.serializer && route.cfg?.schema) {
          // route.serializer is a fast-json-stringify function
          res.setHeader('Content-Type', 'application/json')
          try {
            res.end((route.serializer as any)(responsePayload ?? null))
          } catch (err) {
            // fallback
            res.end(JSON.stringify(responsePayload ?? null))
          }
        } else {
          if (!res.headersSent) res.setHeader('Content-Type', 'application/json')
          try {
            res.end(JSON.stringify(responsePayload ?? null))
          } catch {
            try { res.end('{"error":"serialization failed"}') } catch {}
          }
        }
        ctx._ended = true
      }
    } catch (err: any) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      for (const h of this.hooks.onError) {
        const maybe = h(ctx, errorObj)
        if (isThenable(maybe)) await maybe
      }
      if (!res.headersSent) res.setHeader('Content-Type', 'application/json')
      res.statusCode = 500
      try {
        res.end(JSON.stringify({ error: errorObj.message }))
      } catch {
        if (!res.writableEnded) res.end('{"error":"internal"}')
      }
      ctx._ended = true
    }
  }

  // ---------------------------
  // startServer — single or cluster
  // ---------------------------
  public async startServer({ port, maxConcurrency = 100 }: { port?: number; maxConcurrency?: number } = {}): Promise<void> {
    // resolve desired port from input or env
    const desiredPort =
      typeof port === 'number'
        ? port
        : (process.env.PORT ? Number(process.env.PORT) : (process.env.VEGAA_PORT ? Number(process.env.VEGAA_PORT) : undefined))

    // --- Cluster mode: master forks workers; workers will listen on SAME port ---
    if (cluster.isPrimary && process.env.CLUSTER === 'true') {
      const cpus = Math.max(1, os.cpus().length)
      const resolvedPort = await findAvailablePort(desiredPort ?? 3000)
      process.env.VEGAA_PORT = String(resolvedPort)

      console.log(`🔁 Starting cluster master — forking ${cpus} workers; port=${resolvedPort}`)
      for (let i = 0; i < cpus; i++) cluster.fork()
      cluster.on('exit', (w) => {
        console.warn(`worker ${w.process.pid} died — restarting...`)
        cluster.fork()
      })
      return
    }

    // --- Worker: bind to master's assigned VEGAA_PORT without probing ---
    let finalPort: number
    if (process.env.CLUSTER === 'true' && cluster.isWorker) {
      if (!process.env.VEGAA_PORT) throw new Error('VEGAA_PORT not set in worker')
      finalPort = Number(process.env.VEGAA_PORT)
    } else {
      // --- Single-process: if desiredPort is busy, fall back to next available ---
      finalPort = await findAvailablePort(desiredPort ?? 3000)
    }

    const sem = new Semaphore(Math.max(1, maxConcurrency))

    const server = http.createServer(async (req, res) => {
      await sem.acquire()
      try {
        await this.handleRequest(req, res)
      } finally {
        sem.release()
      }
    })

    // production-friendly tuning
    server.keepAliveTimeout = 62_000
    server.headersTimeout = 65_000

    await new Promise<void>((resolve, reject) => {
      server.on('error', (err) => reject(err))
      server.listen(finalPort, () => {
        const addr = server.address() as AddressInfo | null
        console.log(`🚀 Vegaa listening on port ${addr?.port ?? finalPort} (pid ${process.pid})`)
        resolve()
      })
    })
  }

  // ---------------------------
  // hooks helpers
  // ---------------------------
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
 * createApp factory: returns callable wrapper (app('/path') style).
 * Also exposes .startVegaaServer() sugar method.
 */
export function createApp(opts?: Record<string, any>) {
  const app = new App(opts)
  const callable = ((path: string) => app.call(path)) as unknown as App & ((path: string) => RouteBuilder) & {
    startVegaaServer: (opts?: { port?: number; maxConcurrency?: number }) => Promise<void>
  }

  Object.setPrototypeOf(callable, App.prototype)
  Object.assign(callable, app)

  callable.startVegaaServer = async function (opts?: { port?: number; maxConcurrency?: number }) {
    return app.startServer(opts)
  }

  return callable
}