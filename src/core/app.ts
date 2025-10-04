import http from 'http'
import os from 'os'
import cluster from 'cluster'
import { RouteBuilder } from './routeBuilder'
import { Handler, Context, Route, MiddlewareEntry } from './types'
import { Plugin, isPlugin, isMiddleware } from './plugin'
import { buildContext } from '../utils/context'
import { Semaphore } from '../utils/semaphore'
import { cacheGetOrSet } from '../utils/cache'
import { jsonMiddleware } from '../plugins/json'
import { corsMiddleware } from '../plugins/cors'
import { extractParamNames, compileArgBuilder } from '../utils/params'

export class App {
  private routeMap: Map<string, Map<string, Route>> = new Map()
  private globalMiddlewares: MiddlewareEntry[] = []

  private hooks = {
    onRequest: [] as ((ctx: Context) => Promise<void> | void)[],
    onResponse: [] as ((ctx: Context, data: any) => Promise<void> | void)[],
    onError: [] as ((ctx: Context, err: Error) => Promise<void> | void)[]
  }

  constructor(public opts: Record<string, any> = {}) {}

  // -------------------------------------------------------------------
  // ROUTE REGISTRATION
  // -------------------------------------------------------------------
  public route(path: string) {
    return new RouteBuilder(this, path)
  }
  public call(path: string) {
    return this.route(path)
  }

  // -------------------------------------------------------------------
  // GLOBAL MIDDLEWARES
  // -------------------------------------------------------------------
  public middleware(mw: Handler | Handler[]): this {
    const add = (fn: Handler) => {
      const names = extractParamNames(fn as Function)
      const builder = names.length ? compileArgBuilder(names) : undefined
      this.globalMiddlewares.push({ fn, paramNames: names, argBuilder: builder })
    }
    if (Array.isArray(mw)) {
      for (const fn of mw) {
        if (!isMiddleware(fn)) throw new TypeError('Invalid middleware')
        add(fn)
      }
    } else {
      if (!isMiddleware(mw)) throw new TypeError('Invalid middleware')
      add(mw)
    }
    return this
  }

  // -------------------------------------------------------------------
  // PLUGINS
  // -------------------------------------------------------------------
  public async plugin(plugin: Plugin): Promise<this> {
    if (!isPlugin(plugin)) throw new TypeError('plugin() expects an object with register(app)')
    await plugin.register(this)
    return this
  }

  public json(): this {
    const fn = jsonMiddleware()
    const names = extractParamNames(fn as Function)
    const builder = names.length ? compileArgBuilder(names) : undefined
    this.globalMiddlewares.unshift({ fn, paramNames: names, argBuilder: builder })
    return this
  }

  public cors(opts?: any): this {
    const fn = corsMiddleware(opts)
    const names = extractParamNames(fn as Function)
    const builder = names.length ? compileArgBuilder(names) : undefined
    this.globalMiddlewares.unshift({ fn, paramNames: names, argBuilder: builder })
    return this
  }

  public decorate<K extends string, V>(key: K, value: V): asserts this is this & Record<K, V> {
    if (!key || typeof key !== 'string') throw new TypeError('decorate() requires string key')
    if (key in this) throw new Error(`Property "${key}" already exists on app`)
    ;(this as any)[key] = value
  }

  // -------------------------------------------------------------------
  // ROUTE HANDLING
  // -------------------------------------------------------------------
  public registerRoute(
    method: string,
    path: string,
    handler: Handler,
    mws: Handler[],
    cfg: Record<string, any> | null
  ) {
    const methodKey = method.toUpperCase()
    const table = this.routeMap.get(methodKey) ?? new Map<string, Route>()

    const routeMws: MiddlewareEntry[] = []
    for (const fn of mws) {
      const names = extractParamNames(fn as Function)
      const builder = names.length ? compileArgBuilder(names) : undefined
      routeMws.push({ fn, paramNames: names, argBuilder: builder })
    }

    const names = extractParamNames(handler as Function)
    const builder = names.length ? compileArgBuilder(names) : undefined

    table.set(path, { method: methodKey, path, handler, mws: routeMws, cfg, paramNames: names, argBuilder: builder })
    this.routeMap.set(methodKey, table)
  }

  private getRoute(method: string, pathname: string): Route | null {
    const table = this.routeMap.get((method || 'GET').toUpperCase())
    return table?.get(pathname) ?? null
  }

  // -------------------------------------------------------------------
  // INTERNAL EXECUTION
  // -------------------------------------------------------------------
private async runMiddlewares(list: MiddlewareEntry[], ctx: Context) {
  for (const entry of list) {
    if (ctx._ended || ctx.res.writableEnded) return

    let result: any
    if (entry.argBuilder) result = await Promise.resolve((entry.fn as any)(...entry.argBuilder(ctx)))
    else result = await Promise.resolve((entry.fn as any)(ctx))

    // ✅ Merge returned object into ctx
    if (result && typeof result === 'object') {
      for (const key in result) {
        if (key !== 'req' && key !== 'res' && key !== '_ended') {
          ;(ctx as any)[key] = result[key]
        }
      }
    }

    if (ctx._ended || ctx.res.writableEnded) return
  }
}

  // -------------------------------------------------------------------
  // MAIN REQUEST HANDLER
  // -------------------------------------------------------------------
  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    const ctx = await buildContext(req, res)
    let responsePayload: any = null

    try {
      // ---------- onRequest ----------
      for (const hook of this.hooks.onRequest) await hook(ctx)
      if (ctx._ended || res.writableEnded) return

      // ---------- global middleware ----------
      await this.runMiddlewares(this.globalMiddlewares, ctx)
      if (ctx._ended || res.writableEnded) return

      // ---------- route lookup ----------
      const route = this.getRoute(ctx.req.method || 'GET', ctx.pathname)
      if (!route) {
        if ((ctx.req.method || '').toUpperCase() === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }
        res.statusCode = 404
        if (!res.headersSent) res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Not found' }))
        return
      }

      // ---------- route-level middleware ----------
      await this.runMiddlewares(route.mws, ctx)
      if (ctx._ended || res.writableEnded) return

      // ---------- handler ----------
      if (route.cfg?.cacheTTL) {
        const key = `${route.method}:${route.path}:${JSON.stringify(ctx.query)}`
        responsePayload = await cacheGetOrSet(key, route.cfg.cacheTTL, async () => {
          const args = route.argBuilder ? route.argBuilder(ctx) : [ctx]
          return await (route.handler as any)(...args)
        })
      } else {
        const args = route.argBuilder ? route.argBuilder(ctx) : [ctx]
        responsePayload = await (route.handler as any)(...args)
      }

      // ---------- onResponse ----------
      for (const hook of this.hooks.onResponse) await hook(ctx, responsePayload)

      // ---------- final send ----------
      if (!ctx._ended && !res.writableEnded) {
        if (!res.headersSent) res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(responsePayload ?? null))
        ctx._ended = true
      }
    } catch (err: any) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      for (const hook of this.hooks.onError) await hook(ctx, errorObj)
      if (!res.headersSent) res.setHeader('Content-Type', 'application/json')
      if (!res.writableEnded) {
        res.statusCode = 500
        res.end(JSON.stringify({ error: errorObj.message }))
      }
    }
  }

  // -------------------------------------------------------------------
  // SERVER STARTER
  // -------------------------------------------------------------------
  public async startServer({ port = 3000, maxConcurrency = 100 } = {}) {
    if (cluster.isPrimary && process.env.CLUSTER === 'true') {
      const cpus = Math.max(1, os.cpus().length)
      for (let i = 0; i < cpus; i++) cluster.fork()
      cluster.on('exit', (w) => {
        console.warn(`worker ${w.process.pid} died — restarting...`)
        cluster.fork()
      })
      return
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

    return new Promise<void>((resolve, reject) => {
      server.on('error', reject)
      server.listen(port, () => {
        console.log(`🚀 VegaJS listening on port ${port} (pid ${process.pid})`)
        resolve()
      })
    })
  }
}

// -------------------------------------------------------------------
// FACTORY
// -------------------------------------------------------------------
export function createApp(opts?: Record<string, any>) {
  const app = new App(opts)
  const callable = ((path: string) => app.call(path)) as unknown as App & ((path: string) => RouteBuilder)
  Object.setPrototypeOf(callable, App.prototype)
  Object.assign(callable, app)
  return callable
}