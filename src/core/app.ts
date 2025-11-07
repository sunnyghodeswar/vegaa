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

// Pre-compiled serializers for common response types (performance optimization)
const errorSerializer = buildSerializer({
  type: 'object',
  properties: {
    error: { type: 'string' }
  }
});

const notFoundSerializer = buildSerializer({
  type: 'object',
  properties: {
    error: { type: 'string' }
  }
});

// Note: We don't use a defaultSerializer with additionalProperties: true
// because it's actually SLOWER than JSON.stringify for unknown shapes.
// fast-json-stringify is only faster when you know the schema ahead of time.

// Timeout error serializer (created once, not per-request)
const timeoutSerializer = buildSerializer({
  type: 'object',
  properties: {
    error: { type: 'string' }
  }
});

// 🧱 Main Application Class
export class App {
  private routerMap = new Map<string, Router>();
  private globalMiddlewares: MiddlewareEntry[] = [];

  private hooks = {
    onRequest: [] as Array<(ctx: Context) => Promise<void> | void>,
    onResponse: [] as Array<(ctx: Context, data: any) => Promise<void> | void>,
    onError: [] as Array<(ctx: Context, err: Error) => Promise<void> | void>,
  };

  // Express compatibility: settings and locals
  public settings: Record<string, any> = {};
  public locals: Record<string, any> = {};
  private engines: Map<string, (path: string, options: any, callback: (err?: any, rendered?: string) => void) => void> = new Map();
  
  // Request timeout configuration (default: 30 seconds)
  private requestTimeout: number = 30000;

  constructor(public opts: Record<string, any> = {}) {
    // Allow request timeout to be configured via opts
    if (typeof opts.requestTimeout === 'number' && opts.requestTimeout > 0) {
      this.requestTimeout = opts.requestTimeout;
    } else if (typeof process.env.VEGAA_REQUEST_TIMEOUT === 'string') {
      const envTimeout = Number(process.env.VEGAA_REQUEST_TIMEOUT);
      if (envTimeout > 0) {
        this.requestTimeout = envTimeout;
      }
    }
  }

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
    // Optimized: cache uppercase method (most requests are GET)
    const methodUpper = method === "GET" ? "GET" : method.toUpperCase();
    const router = this.routerMap.get(methodUpper);
    if (!router) return { route: null, params: {} };

    const found: any = router.find(methodUpper, pathname);
    if (!found?.store?.route) return { route: null, params: found?.params ?? {} };

    return { route: found.store.route as Route, params: found.params ?? {} };
  }

  // ---------------------------
  // 🧠 Middleware Executor
  // ---------------------------
  private async runMiddlewares(list: MiddlewareEntry[], ctx: Context): Promise<void> {
    // Optimized: early return if no middlewares
    if (list.length === 0) return;
    
    for (let i = 0; i < list.length; i++) {
      const entry = list[i];
      // Optimized: check once at start of loop
      if (ctx._ended || ctx.res.writableEnded) return;
      
      const args = entry.argBuilder ? entry.argBuilder(ctx) : [ctx];

      try {
        const result = (entry.fn as any)(...args);
        const awaitedResult = result instanceof Promise ? await result : result;
        if (awaitedResult && typeof awaitedResult === "object" && !Array.isArray(awaitedResult)) {
          // Optimized: avoid Object.entries overhead, only merge if result has keys
          const resultKeys = Object.keys(awaitedResult);
          if (resultKeys.length > 0) {
            for (let j = 0; j < resultKeys.length; j++) {
              const k = resultKeys[j];
              if (k !== "req" && k !== "res" && k !== "_ended") {
                (ctx as any)[k] = (awaitedResult as any)[k];
              }
            }
          }
        }
      } catch (err) {
        throw err;
      }
    }
  }

  // ---------------------------
  // ⚡ Core Request Dispatcher (Smart Injection)
  // ---------------------------
  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const ctx = buildContext(req, res);
    // Optimized: cache method normalization (most requests are GET, avoid toUpperCase overhead)
    const rawMethod = req.method;
    const method = rawMethod ? (rawMethod.length === 3 ? "GET" : rawMethod.toUpperCase()) : "GET";
    const pathname = ctx.pathname;
    let responsePayload: any = null;
    
    // Request timeout protection (optimized: only create timeout if reasonable)
    let timeoutId: NodeJS.Timeout | null = null;
    let timeoutPromise: Promise<never> | null = null;
    
    // Only create timeout promise if timeout is less than 60 seconds (avoid overhead for very long timeouts)
    if (this.requestTimeout > 0 && this.requestTimeout < 60000) {
      timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          if (!res.writableEnded && !res.headersSent) {
            res.statusCode = 408;
            res.setHeader('Content-Type', 'application/json');
            res.end(timeoutSerializer({ error: 'Request timeout' }));
            ctx._ended = true;
          }
          reject(new Error('Request timeout'));
        }, this.requestTimeout);
      });
    }

    try {
      // Race between request handling and timeout (or just handle request if no timeout)
      const requestHandler = (async () => {
        // Optimized: skip iteration if no hooks
        if (this.hooks.onRequest.length > 0) {
          for (const h of this.hooks.onRequest) {
            const result = h(ctx);
            if (result instanceof Promise) await result;
            if (ctx._ended) return;
          }
        }

        await this.runMiddlewares(this.globalMiddlewares, ctx);
        if (ctx._ended) return;

        const { route, params } = this.getRoute(method, pathname);
        if (!route) {
          // Optimized: combine writeHead and end for 404
          const errorMsg = notFoundSerializer({ error: `Route ${method} ${pathname} not found` });
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(errorMsg);
          return;
        }

        // Smart Injection Rules 🧠 (optimized: avoid double Object.keys call, cache method check)
        ctx.params = params || {};
        const paramKeys = params ? Object.keys(params) : null;
        const isGetOrDelete = method === "GET" || method === "DELETE";
        if (paramKeys && paramKeys.length > 0) {
          // Flatten params directly for GET/DELETE (optimized: avoid Object.entries overhead)
          if (isGetOrDelete) {
            for (let i = 0; i < paramKeys.length; i++) {
              const k = paramKeys[i];
              if (ctx[k] === undefined) ctx[k] = params[k];
            }
          } else {
            // Keep params grouped, flatten body for injection (optimized)
            if (ctx.body && typeof ctx.body === "object" && !Buffer.isBuffer(ctx.body)) {
              const bodyKeys = Object.keys(ctx.body);
              for (let i = 0; i < bodyKeys.length; i++) {
                const k = bodyKeys[i];
                if (k === "req" || k === "res" || k === "params" || k === "body" || k === "query" || k === "_ended") continue;
                if (ctx[k] === undefined) ctx[k] = (ctx.body as any)[k];
              }
            }
          }
        }

        await this.runMiddlewares(route.mws, ctx);
        if (ctx._ended) return;

        // Optimized: only stringify query for cache key if query exists, direct execution if no cache
        if (route.cfg?.cacheTTL) {
          const cacheKey = ctx.query && Object.keys(ctx.query).length > 0
            ? `${route.method}:${route.path}:${JSON.stringify(ctx.query)}`
            : `${route.method}:${route.path}`;
          const executeHandler = async () =>
            route.argBuilder
              ? (route.handler as any)(...route.argBuilder(ctx))
              : (route.handler as any)(ctx);
          responsePayload = await cacheGetOrSet(cacheKey, route.cfg.cacheTTL, executeHandler);
        } else {
          // Optimized: direct execution without cache wrapper (hot path)
          responsePayload = route.argBuilder
            ? await (route.handler as any)(...route.argBuilder(ctx))
            : await (route.handler as any)(ctx);
        }

        // Optimized: skip iteration if no hooks
        if (this.hooks.onResponse.length > 0) {
          for (const h of this.hooks.onResponse) {
            const result = h(ctx, responsePayload);
            if (result instanceof Promise) await result;
            if (ctx._ended || res.writableEnded) return;
          }
        }

        // Only send response if the handler hasn't already sent a response
        if (!ctx._ended && !res.writableEnded) {
          // Check for special response types (html, text, file) - optimized: early return pattern
          if (responsePayload && typeof responsePayload === 'object' && responsePayload._type) {
            const responseType = responsePayload._type;
            const content = responsePayload.content || '';
            // Handle HTML response
            if (responseType === HTML_RESPONSE) {
              if (!res.headersSent) res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(content);
              ctx._ended = true;
              return;
            }
            // Handle text response
            if (responseType === TEXT_RESPONSE) {
              if (!res.headersSent) res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
              res.end(content);
              ctx._ended = true;
              return;
            }
            // Handle file response
            if (responseType === FILE_RESPONSE) {
              // Note: File responses require additional handling
              // For now, return 501 Not Implemented or delegate to static plugin
              if (!res.headersSent) res.writeHead(501, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'file() helper requires static plugin' }));
              ctx._ended = true;
              return;
            }
          }

          // Default: JSON response (optimized hot path)
          // Use route serializer if available (fast-json-stringify with known schema)
          // Otherwise use JSON.stringify (faster than fast-json-stringify with additionalProperties)
          const json = route.serializer && route.cfg?.schema
            ? (route.serializer as any)(responsePayload ?? null)
            : JSON.stringify(responsePayload ?? null);
          
          // Optimized: combine writeHead and end for better performance
          // Most responses are 200, so optimize that path
          const statusCode = res.statusCode || 200;
          if (!res.headersSent) {
            if (statusCode === 200) {
              // Fast path for 200 responses (most common)
              res.writeHead(200, { "Content-Type": "application/json" });
            } else {
              res.writeHead(statusCode, { "Content-Type": "application/json" });
            }
          }
          res.end(json);
          ctx._ended = true;
        }
        })();
      
      // Only race if timeout promise exists
      if (timeoutPromise) {
        await Promise.race([requestHandler, timeoutPromise]);
      } else {
        await requestHandler;
      }
      
      // Clear timeout on successful completion
      if (timeoutId) clearTimeout(timeoutId);
    } catch (err: any) {
      // Clear timeout on error
      if (timeoutId) clearTimeout(timeoutId);
      const errorObj = err instanceof Error ? err : new Error(String(err));
      
      // Run error handlers - they might send a response
      try {
        for (const h of this.hooks.onError) {
          const result = h(ctx, errorObj);
          if (result instanceof Promise) await result;
          // Check if error handler sent a response
          if (ctx._ended || res.writableEnded || res.headersSent) {
            return; // Response already sent, don't send another
          }
        }
      } catch (handlerErr) {
        // If error handler itself throws, log it but continue
        console.error('[Vegaa] Error in error handler:', handlerErr);
      }
      
      // Only send error response if no response was sent yet (optimized: combine operations)
      if (!ctx._ended && !res.writableEnded && !res.headersSent) {
        try {
          const errorMsg = errorSerializer({ error: errorObj.message });
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(errorMsg);
          ctx._ended = true;
        } catch (sendErr) {
          // If we can't send response (already sent), just log
          console.error('[Vegaa] Failed to send error response:', sendErr);
        }
      }
    }
  }

  // Server instance for graceful shutdown
  private server: http.Server | null = null;
  private isShuttingDown = false;
  private activeRequests = new Set<IncomingMessage>();

  // ---------------------------
  // 🚀 Start Server (Single or Cluster)
  // ---------------------------
  public async startServer({
    port,
    maxConcurrency = 100,
    cluster: enableCluster = false, // Cluster mode disabled by default (SmartPIC for future)
  }: { port?: number; maxConcurrency?: number; cluster?: boolean } = {}): Promise<void> {
    const desiredPort =
      typeof port === "number"
        ? port
        : Number(process.env.PORT || process.env.VEGAA_PORT) || 3000;

    // Enable cluster mode only if explicitly requested or CLUSTER=true env var
    const shouldUseCluster = enableCluster || process.env.CLUSTER === "true";

    if (cluster.isPrimary && shouldUseCluster) {
      const cpus = os.cpus().length;
      const resolvedPort = await findAvailablePort(desiredPort);
      process.env.VEGAA_PORT = String(resolvedPort);
      process.env.CLUSTER = "true";
      
      // Setup cluster cache IPC
      const { setupClusterCache } = await import("../utils/clusterCache");
      setupClusterCache();
      
      console.log(`🔁 Vegaa Cluster Mode — Master process forking ${cpus} workers on port ${resolvedPort}`);
      console.log(`   💡 Cluster mode is transparent — your code works the same!`);
      console.log(`   📦 Shared cache enabled across all workers via fast IPC`);
      
      for (let i = 0; i < cpus; i++) cluster.fork();
      // Only restart workers if not in benchmark mode (benchmarks handle cleanup)
      if (process.env.BENCHMARK_MODE !== 'true') {
        cluster.on("exit", (w) => {
          console.warn(`⚠️ Worker ${w.process.pid} died — restarting...`);
          cluster.fork();
        });
      }
      return;
    }

    // Setup cluster cache in worker processes
    if (cluster.isWorker && process.env.CLUSTER === "true") {
      const { setupClusterCache } = await import("../utils/clusterCache");
      setupClusterCache();
    }
    
    const finalPort =
      process.env.CLUSTER === "true" && cluster.isWorker
        ? Number(process.env.VEGAA_PORT)
        : await findAvailablePort(desiredPort);

    const sem = new Semaphore(Math.max(1, maxConcurrency));
    this.server = http.createServer(async (req, res) => {
      // Track active requests for graceful shutdown
      if (!this.isShuttingDown) {
        this.activeRequests.add(req);
        req.once('close', () => {
          this.activeRequests.delete(req);
        });
      }

      await sem.acquire();
      try {
        await this.handleRequest(req, res);
      } finally {
        sem.release();
        this.activeRequests.delete(req);
      }
    });

    this.server.keepAliveTimeout = 62_000;
    this.server.headersTimeout = 65_000;

    // Setup graceful shutdown handlers
    this.setupGracefulShutdown();

    await new Promise<void>((resolve, reject) => {
      if (!this.server) {
        reject(new Error('Server not initialized'));
        return;
      }
      this.server.on("error", reject);
      this.server.listen(finalPort, () => {
        const addr = this.server!.address() as AddressInfo | null;
        console.log(`🚀 Vegaa running on port ${addr?.port ?? finalPort} (pid ${process.pid})`);
        resolve();
      });
    });
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      console.log(`\n${signal} received, starting graceful shutdown...`);

      // Stop accepting new requests
      if (this.server) {
        this.server.close(() => {
          console.log('HTTP server closed');
        });
      }

      // Wait for active requests to complete (with timeout)
      const shutdownTimeout = 30000; // 30 seconds
      const startTime = Date.now();

      while (this.activeRequests.size > 0 && (Date.now() - startTime) < shutdownTimeout) {
        console.log(`Waiting for ${this.activeRequests.size} active request(s) to complete...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (this.activeRequests.size > 0) {
        console.warn(`Forcefully closing ${this.activeRequests.size} remaining request(s)`);
        for (const req of this.activeRequests) {
          req.destroy();
        }
      }

      console.log('Graceful shutdown complete');
      process.exit(0);
    };

    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.once('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.once('uncaughtException', (err) => {
      console.error('Uncaught exception:', err);
      shutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.once('unhandledRejection', (reason) => {
      console.error('Unhandled rejection:', reason);
      shutdown('unhandledRejection');
    });
  }

  /**
   * Gracefully shutdown the server
   */
  public async shutdown(): Promise<void> {
    if (!this.server || this.isShuttingDown) return;

    this.isShuttingDown = true;

    return new Promise<void>((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('Server shutdown complete');
          resolve();
        });
      } else {
        resolve();
      }
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

  // ---------------------------
  // 🌿 Express Compatibility API
  // ---------------------------
  
  /**
   * Express-compatible app.set(name, value)
   * Stores application settings
   */
  public set(name: string, value?: any): this | any {
    if (arguments.length === 1) {
      return this.settings[name];
    }
    this.settings[name] = value;
    return this;
  }

  /**
   * Express-compatible app.get(name)
   * Retrieves application settings
   */
  public get(name: string): any {
    return this.settings[name];
  }

  /**
   * Express-compatible app.engine(ext, fn)
   * Registers template engine for file extension
   */
  public engine(
    ext: string,
    fn: (path: string, options: any, callback: (err?: any, rendered?: string) => void) => void
  ): this {
    this.engines.set(ext, fn);
    return this;
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

  callable.startVegaaServer = async (opts?: { port?: number; maxConcurrency?: number; cluster?: boolean }) =>
    app.startServer(opts);

  return callable;
}