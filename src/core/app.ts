// src/core/app.ts
/**
 * 🌿 Vegaa — Core App (Type-Safe & Production-Minded)
 *
 * Key Features:
 *  - Smart injection (Flatten body, grouped params)
 *  - Type-safe middleware and route registration
 *  - Fast router dispatch via adapter
 *  - Optional JSON serializer per route
 *  - Cluster + concurrency support
 *  - Minimal dependencies, max performance
 */

import http, { IncomingMessage, ServerResponse } from "http";
import os from "os";
import cluster from "cluster";
import type { AddressInfo } from "net";
import { RouteBuilder } from "./routeBuilder";
import type { Handler, Context, Route, MiddlewareEntry } from "./types";
import { isPlugin } from "./plugins";
import { buildContext } from "../utils/context";
import { Semaphore } from "../utils/semaphore";
import { cacheGetOrSet } from "../utils/cache";
import { extractParamNames, compileArgBuilder } from "../utils/params";
import { Router } from "../router/adapter";
import { findAvailablePort } from "../utils/port";
import buildSerializer from "fast-json-stringify";
import { HTML_RESPONSE, TEXT_RESPONSE, FILE_RESPONSE } from "../utils/response";

// 🧱 Main Application Class
export class App {
  private routerMap = new Map<string, Router>();
  private globalMiddlewares: MiddlewareEntry[] = [];

  private hooks = {
    onRequest: [] as Array<(ctx: Context) => Promise<void> | void>,
    onResponse: [] as Array<(ctx: Context, data: any) => Promise<void> | void>,
    onError: [] as Array<(ctx: Context, err: Error) => Promise<void> | void>,
  };

  constructor(public opts: Record<string, any> = {}) {}

  // ---------------------------
  // 🚏 Route Factory
  // ---------------------------
  public route(path: string): RouteBuilder {
    return new RouteBuilder(this, path);
  }

  public call(path: string): RouteBuilder {
    return this.route(path);
  }

  // ---------------------------
  // 🧩 Middleware Registration
  // ---------------------------
  public middleware(mw: Handler | Handler[]): this {
    const addOne = (fn: Handler) => {
      if (typeof fn !== "function") throw new TypeError("middleware must be a function");
      const names = extractParamNames(fn);
      const builder = names.length ? compileArgBuilder(names) : undefined;
      this.globalMiddlewares.push({ fn, paramNames: names, argBuilder: builder });
    };
    if (Array.isArray(mw)) mw.forEach(addOne);
    else addOne(mw);
    return this;
  }

  // ---------------------------
  // 🔌 Plugin Registration
  // ---------------------------
  public async plugin(plugin: any, opts?: Record<string, any>): Promise<this> {
    if (!isPlugin(plugin)) throw new TypeError("Invalid plugin: must have register(app)");
    await plugin.register(this, opts);
    return this;
  }

  // ---------------------------
  // 🪶 Decorator (adds properties safely)
  // ---------------------------
  public decorate<K extends string, V>(key: K, value: V): asserts this is this & Record<K, V> {
    if (!key || typeof key !== "string") throw new TypeError("decorate() key must be string");
    const self = this as unknown as Record<string, unknown>;
    if (key in self) throw new Error(`Property "${key}" already exists on app`);
    self[key] = value;
  }

  // ---------------------------
  // 🛠️ Route Registration (from RouteBuilder)
  // ---------------------------
  public registerRoute(
    method: string,
    path: string,
    handler: Handler,
    mws: Handler[],
    cfg: Record<string, any> | null
  ): void {
    const methodKey = method.toUpperCase();
    let router = this.routerMap.get(methodKey);
    if (!router) {
      router = new Router();
      this.routerMap.set(methodKey, router);
    }

    // Compile route middlewares
    const routeMws: MiddlewareEntry[] = mws.map((fn) => {
      const names = extractParamNames(fn);
      return { fn, paramNames: names, argBuilder: names.length ? compileArgBuilder(names) : undefined };
    });

    // Compile handler + serializer
    const paramNames = extractParamNames(handler);
    const argBuilder = paramNames.length ? compileArgBuilder(paramNames) : undefined;
    const serializer = cfg?.schema ? buildSerializer(cfg.schema) : undefined;

    const route: Route = {
      method: methodKey,
      path,
      handler,
      mws: routeMws,
      cfg,
      paramNames,
      argBuilder,
      serializer: serializer as any,
    };

    router.on(methodKey, path, { route } as any, () => {});
  }

  // ---------------------------
  // 🔍 Route Resolver
  // ---------------------------
  private getRoute(
    method: string,
    pathname: string
  ): { route: Route | null; params: Record<string, string> } {
    const router = this.routerMap.get(method.toUpperCase());
    if (!router) return { route: null, params: {} };

    const found: any = router.find(method, pathname);
    if (!found?.store?.route) return { route: null, params: found?.params ?? {} };

    return { route: found.store.route as Route, params: found.params ?? {} };
  }

  // ---------------------------
  // 🧠 Middleware Executor
  // ---------------------------
  private async runMiddlewares(list: MiddlewareEntry[], ctx: Context): Promise<void> {
    for (const entry of list) {
      if (ctx._ended || ctx.res.writableEnded) return;
      const args = entry.argBuilder ? entry.argBuilder(ctx) : [ctx];

      try {
        const result = await Promise.resolve((entry.fn as any)(...args));
        if (result && typeof result === "object" && !Array.isArray(result)) {
          Object.entries(result).forEach(([k, v]) => {
            if (!["req", "res", "_ended"].includes(k)) (ctx as any)[k] = v;
          });
        }
      } catch (err) {
        throw err;
      }
      if (ctx._ended || ctx.res.writableEnded) return;
    }
  }

  // ---------------------------
  // ⚡ Core Request Dispatcher (Smart Injection)
  // ---------------------------
  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const ctx = buildContext(req, res);
    const method = (req.method || "GET").toUpperCase();
    const pathname = ctx.pathname;
    let responsePayload: any = null;

    try {
      for (const h of this.hooks.onRequest) await Promise.resolve(h(ctx));
      if (ctx._ended) return;

      await this.runMiddlewares(this.globalMiddlewares, ctx);
      if (ctx._ended) return;

      const { route, params } = this.getRoute(method, pathname);
      if (!route) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: `Route ${method} ${pathname} not found` }));
        return;
      }

      // Smart Injection Rules 🧠
      ctx.params = params || {};

      if (method === "GET" || method === "DELETE") {
        // Flatten params directly
        for (const [k, v] of Object.entries(params)) {
          if (ctx[k] === undefined) ctx[k] = v;
        }
      } else {
        // Keep params grouped, flatten body for injection
        if (ctx.body && typeof ctx.body === "object" && !Buffer.isBuffer(ctx.body)) {
          for (const [k, v] of Object.entries(ctx.body)) {
            if (["req", "res", "params", "body", "query", "_ended"].includes(k)) continue;
            if (ctx[k] === undefined) ctx[k] = v;
          }
        }
      }

      await this.runMiddlewares(route.mws, ctx);
      if (ctx._ended) return;

      const executeHandler = async () =>
        route.argBuilder
          ? (route.handler as any)(...route.argBuilder(ctx))
          : (route.handler as any)(ctx);

      responsePayload = route.cfg?.cacheTTL
        ? await cacheGetOrSet(
            `${route.method}:${route.path}:${JSON.stringify(ctx.query)}`,
            route.cfg.cacheTTL,
            executeHandler
          )
        : await executeHandler();

      for (const h of this.hooks.onResponse) await Promise.resolve(h(ctx, responsePayload));

      // Only send response if the handler hasn't already sent a response
      if (!ctx._ended && !res.writableEnded) {
        // Check for special response types (html, text, file)
        if (responsePayload && typeof responsePayload === 'object' && responsePayload._type) {
          // Handle HTML response
          if (responsePayload._type === HTML_RESPONSE) {
            res.statusCode ||= 200;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(responsePayload.content || '');
            ctx._ended = true;
            return;
          }
          // Handle text response
          if (responsePayload._type === TEXT_RESPONSE) {
            res.statusCode ||= 200;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.end(responsePayload.content || '');
            ctx._ended = true;
            return;
          }
          // Handle file response
          if (responsePayload._type === FILE_RESPONSE) {
            // Note: File responses require additional handling
            // For now, return 501 Not Implemented or delegate to static plugin
            res.statusCode = 501;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'file() helper requires static plugin' }));
            ctx._ended = true;
            return;
          }
        }

        // Default: JSON response
        res.statusCode ||= 200;
        res.setHeader("Content-Type", "application/json");
        const json =
          route.serializer && route.cfg?.schema
            ? (route.serializer as any)(responsePayload ?? null)
            : JSON.stringify(responsePayload ?? null);
        res.end(json);
        ctx._ended = true;
      }
    } catch (err: any) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      for (const h of this.hooks.onError) await Promise.resolve(h(ctx, errorObj));
      if (!res.headersSent) res.setHeader("Content-Type", "application/json");
      res.statusCode = 500;
      res.end(JSON.stringify({ error: errorObj.message }));
    }
  }

  // ---------------------------
  // 🚀 Start Server (Single or Cluster)
  // ---------------------------
  public async startServer({
    port,
    maxConcurrency = 100,
  }: { port?: number; maxConcurrency?: number } = {}): Promise<void> {
    const desiredPort =
      typeof port === "number"
        ? port
        : Number(process.env.PORT || process.env.VEGAA_PORT) || 4000;

    if (cluster.isPrimary && process.env.CLUSTER === "true") {
      const cpus = os.cpus().length;
      const resolvedPort = await findAvailablePort(desiredPort);
      process.env.VEGAA_PORT = String(resolvedPort);
      console.log(`🔁 Master — forking ${cpus} workers on port ${resolvedPort}`);
      for (let i = 0; i < cpus; i++) cluster.fork();
      cluster.on("exit", (w) => {
        console.warn(`⚠️ Worker ${w.process.pid} died — restarting...`);
        cluster.fork();
      });
      return;
    }

    const finalPort =
      process.env.CLUSTER === "true" && cluster.isWorker
        ? Number(process.env.VEGAA_PORT)
        : await findAvailablePort(desiredPort);

    const sem = new Semaphore(Math.max(1, maxConcurrency));
    const server = http.createServer(async (req, res) => {
      await sem.acquire();
      try {
        await this.handleRequest(req, res);
      } finally {
        sem.release();
      }
    });

    server.keepAliveTimeout = 62_000;
    server.headersTimeout = 65_000;

    await new Promise<void>((resolve, reject) => {
      server.on("error", reject);
      server.listen(finalPort, () => {
        const addr = server.address() as AddressInfo | null;
        console.log(`🚀 Vegaa running on port ${addr?.port ?? finalPort} (pid ${process.pid})`);
        resolve();
      });
    });
  }

  // ---------------------------
  // 🪝 Lifecycle Hooks
  // ---------------------------
  public onRequest(fn: (ctx: Context) => Promise<void> | void) {
    this.hooks.onRequest.push(fn);
  }
  public onResponse(fn: (ctx: Context, data: any) => Promise<void> | void) {
    this.hooks.onResponse.push(fn);
  }
  public onError(fn: (ctx: Context, err: Error) => Promise<void> | void) {
    this.hooks.onError.push(fn);
  }
}

// ---------------------------
// 🌱 createApp Factory
// ---------------------------
export function createApp(opts?: Record<string, any>) {
  const app = new App(opts);
  const callable = ((path: string) => app.call(path)) as App & ((path: string) => RouteBuilder) & {
    startVegaaServer: (opts?: { port?: number; maxConcurrency?: number; cluster?: boolean }) => Promise<void>;
  };

  Object.setPrototypeOf(callable, App.prototype);
  Object.assign(callable, app);

  callable.startVegaaServer = async (opts?: { port?: number; maxConcurrency?: number; cluster?: boolean }) => {
    // Set cluster mode from options if provided
    if (opts?.cluster !== undefined) {
      process.env.CLUSTER = opts.cluster ? 'true' : 'false'
    }
    return app.startServer(opts)
  };

  return callable;
}