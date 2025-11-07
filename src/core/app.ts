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
    
    // Request timeout protection
    let timeoutId: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        if (!res.writableEnded && !res.headersSent) {
          res.statusCode = 408;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Request timeout' }));
          ctx._ended = true;
        }
        reject(new Error('Request timeout'));
      }, this.requestTimeout);
    });

    try {
      // Race between request handling and timeout
      await Promise.race([
        (async () => {
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
          } catch (innerErr: any) {
            throw innerErr;
          }
        })(),
        timeoutPromise
      ]);
      
      // Clear timeout on successful completion
      if (timeoutId) clearTimeout(timeoutId);
    } catch (err: any) {
      // Clear timeout on error
      if (timeoutId) clearTimeout(timeoutId);
      const errorObj = err instanceof Error ? err : new Error(String(err));
      
      // Run error handlers - they might send a response
      try {
        for (const h of this.hooks.onError) {
          await Promise.resolve(h(ctx, errorObj));
          // Check if error handler sent a response
          if (ctx._ended || res.writableEnded || res.headersSent) {
            return; // Response already sent, don't send another
          }
        }
      } catch (handlerErr) {
        // If error handler itself throws, log it but continue
        console.error('[Vegaa] Error in error handler:', handlerErr);
      }
      
      // Only send error response if no response was sent yet
      if (!ctx._ended && !res.writableEnded && !res.headersSent) {
        try {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: errorObj.message }));
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
  }: { port?: number; maxConcurrency?: number } = {}): Promise<void> {
    const desiredPort =
      typeof port === "number"
        ? port
        : Number(process.env.PORT || process.env.VEGAA_PORT) || 3000;

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
    startVegaaServer: (opts?: { port?: number; maxConcurrency?: number }) => Promise<void>;
  };

  Object.setPrototypeOf(callable, App.prototype);
  Object.assign(callable, app);

  callable.startVegaaServer = async (opts?: { port?: number; maxConcurrency?: number }) =>
    app.startServer(opts);

  return callable;
}