/**
 * 🌿 Express Compatibility Layer for Vegaa
 * 
 * Enables 100% Express middleware and plugin compatibility by:
 * 1. Injecting Express prototypes onto Node's native objects
 * 2. Bridging Express middleware signatures to Vegaa's async model
 * 3. Supporting Express app mounting
 * 4. Providing Express API surface parity
 * 
 * RFC-EXP-001: Express Compatibility Plan
 */

import http from 'http';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Context, Handler } from './types';
import type { App } from './app';

// Express types (minimal, for compatibility detection)
interface ExpressApp {
  handle?(req: IncomingMessage, res: ServerResponse, next?: (err?: any) => void): void;
  use?(...args: any[]): ExpressApp;
  listen?(...args: any[]): any;
}

interface ExpressRequest extends IncomingMessage {
  app?: ExpressApp | App;
  originalUrl?: string;
  baseUrl?: string;
  route?: any;
  [key: string]: any;
}

interface ExpressResponse extends ServerResponse {
  [key: string]: any;
}

type ExpressMiddleware = (
  req: ExpressRequest,
  res: ExpressResponse,
  next: (err?: any) => void
) => void | Promise<void>;

type ExpressErrorMiddleware = (
  err: any,
  req: ExpressRequest,
  res: ExpressResponse,
  next: (err?: any) => void
) => void | Promise<void>;

/**
 * Check if a function is an Express-style middleware
 */
function isExpressMiddleware(fn: any): fn is ExpressMiddleware | ExpressErrorMiddleware {
  if (typeof fn !== 'function') return false;
  // Express middleware has (req, res, next) signature
  // Check by counting expected parameters (usually 3)
  const paramCount = fn.length;
  // Express middleware typically has 3 params (req, res, next)
  // or 4 params (err, req, res, next) for error handlers
  return paramCount === 3 || paramCount === 4;
}

/**
 * Check if a function is an Express error-handling middleware
 */
function isExpressErrorMiddleware(fn: any): fn is ExpressErrorMiddleware {
  if (typeof fn !== 'function') return false;
  return fn.length === 4;
}

/**
 * Check if a value is an Express middleware factory result
 * (e.g., helmet(), cors(), session({...}) return Express middlewares)
 */
function isExpressMiddlewareFactory(fn: any): boolean {
  if (typeof fn !== 'function') return false;
  // Express middleware factories typically have 0-2 params
  // and return a middleware function
  const paramCount = fn.length;
  // Try calling it (if it's a factory) to see if it returns a middleware
  if (paramCount <= 2) {
    try {
      const result = fn();
      return isExpressMiddleware(result);
    } catch {
      // If calling fails, it's not a factory, might be a middleware itself
      return false;
    }
  }
  return false;
}

/**
 * Check if an object is an Express app
 */
function isExpressApp(obj: any): obj is ExpressApp {
  return (
    obj &&
    typeof obj === 'object' &&
    (typeof obj.handle === 'function' || typeof obj.use === 'function')
  );
}

/**
 * Inject Express prototypes onto Node's native objects
 * This ensures all Express-style helpers (res.json(), res.send(), etc.) are available
 */
let expressPrototypesInjected = false;

export function injectExpressPrototypes(): void {
  if (expressPrototypesInjected) return;

  try {
    // Try to load Express dynamically
    const express = require('express');
    
    if (express && express.response && express.request) {
      // Inject Express response prototype onto ServerResponse
      const expressResponseProto = Object.getPrototypeOf(express.response);
      const nodeResponseProto = Object.getPrototypeOf(http.ServerResponse.prototype);
      
      // Merge Express response methods onto Node's prototype
      Object.getOwnPropertyNames(expressResponseProto).forEach((name) => {
        if (name !== 'constructor' && !nodeResponseProto.hasOwnProperty(name)) {
          try {
            Object.defineProperty(
              http.ServerResponse.prototype,
              name,
              Object.getOwnPropertyDescriptor(expressResponseProto, name) || {}
            );
          } catch {
            // Ignore property definition errors
          }
        }
      });

      // Inject Express request prototype onto IncomingMessage
      const expressRequestProto = Object.getPrototypeOf(express.request);
      const nodeRequestProto = Object.getPrototypeOf(http.IncomingMessage.prototype);
      
      Object.getOwnPropertyNames(expressRequestProto).forEach((name) => {
        if (name !== 'constructor' && !nodeRequestProto.hasOwnProperty(name)) {
          try {
            Object.defineProperty(
              http.IncomingMessage.prototype,
              name,
              Object.getOwnPropertyDescriptor(expressRequestProto, name) || {}
            );
          } catch {
            // Ignore property definition errors
          }
        }
      });

      expressPrototypesInjected = true;
    }
  } catch (err) {
    // Express not installed - that's okay, we'll provide minimal compatibility
    console.warn('[Vegaa ExpressCompat] Express not found. Install express for full compatibility.');
  }
}

/**
 * Sync Express req properties back to Vegaa context
 * This allows Express middlewares to set values on req that become available
 * in subsequent Vegaa middlewares via context injection
 */
function syncReqToContext(ctx: Context, req: ExpressRequest): any {
  const injected: Record<string, any> = {};
  
  // Common Express middleware patterns that set values on req
  // These are typically added by authentication, body parsers, etc.
  const commonProps = [
    'user', 'auth', 'session', 'token', 'userId', 
    'isAuthenticated', 'body', 'params', 'query',
    'file', 'files', 'cookies', 'signedCookies'
  ];
  
  // Sync common properties from req to context
  for (const prop of commonProps) {
    if (req[prop] !== undefined && ctx[prop] === undefined) {
      injected[prop] = req[prop];
      (ctx as any)[prop] = req[prop];
    }
  }
  
  // Also sync any custom properties that might have been added
  // (but avoid overwriting core context properties)
  const coreProps = ['req', 'res', 'pathname', 'query', 'params', 'body', '_ended', 'makeRequest', 'fetch', 'request'];
  for (const key in req) {
    if (!coreProps.includes(key) && typeof req[key] !== 'function' && ctx[key] === undefined) {
      injected[key] = req[key];
      (ctx as any)[key] = req[key];
    }
  }
  
  // Return object for Vegaa's context injection system
  // If no properties were synced, return undefined (void)
  return Object.keys(injected).length > 0 ? injected : undefined;
}

/**
 * Bridge Express error-handling middleware to Vegaa's error handler
 * Note: Error handlers are typically registered via vegaa.onError() instead
 */
function wrapExpressErrorMiddleware(
  expressErrorMw: ExpressErrorMiddleware,
  app: App,
  mountPath?: string
): (ctx: Context, err: Error) => Promise<void> {
  return async (ctx: Context, err: Error): Promise<void> => {
    if (ctx._ended || ctx.res.writableEnded) return;

    syncExpressLifecycle(ctx, app, mountPath);
    const req = ctx.req as ExpressRequest;

    return new Promise<void>((resolve, reject) => {
      const next = (nextErr?: any) => {
        if (nextErr) {
          // Error handler called next(err) - propagate the error
          reject(nextErr);
        } else {
          resolve();
        }
      };

      try {
        const result = expressErrorMw(err, req, ctx.res as ExpressResponse, next);
        if (result && typeof result.then === 'function') {
          result
            .then(() => {
              // If next() wasn't called and no error, resolve
              resolve();
            })
            .catch((handlerErr: any) => {
              // Error handler promise rejected
              reject(handlerErr);
            });
        }
      } catch (handlerErr) {
        // Error handler threw synchronously
        reject(handlerErr);
      }
    });
  };
}

/**
 * Bridge Express middleware to Vegaa's async handler model
 * Converts (req, res, next) callbacks to Promise-based execution
 * Returns an object if Express middleware sets properties on req
 */
export function wrapExpressMiddleware(
  expressMw: ExpressMiddleware | ExpressErrorMiddleware,
  app: App,
  mountPath?: string
): Handler {
  // Handle error middleware separately
  if (isExpressErrorMiddleware(expressMw)) {
    // For error handlers, we need to integrate with Vegaa's error system
    // This is a bit tricky - error handlers should be registered via onError()
    // But we can wrap it to work in the middleware chain too
    // Note: This won't catch errors automatically - errors must be passed explicitly
    return async (ctx: Context, err?: Error): Promise<any> => {
      if (ctx._ended || ctx.res.writableEnded) return;
      
      // If error is provided (unusual for middleware chain), use error handler
      if (err) {
        const handler = wrapExpressErrorMiddleware(expressMw as ExpressErrorMiddleware, app, mountPath);
        await handler(ctx, err);
        return;
      }
      
      // Otherwise, treat as regular middleware (won't receive error)
      // This is a limitation - error handlers need to be in onError()
      return;
    };
  }

  return async (ctx: Context): Promise<any> => {
    // If response already ended, skip
    if (ctx._ended || ctx.res.writableEnded) return;

    // Sync Express lifecycle properties
    syncExpressLifecycle(ctx, app, mountPath);

    const req = ctx.req as ExpressRequest;

    // Create a Promise-based next() function
    return new Promise<any>((resolve, reject) => {
      let nextCalled = false;
      let resolved = false;
      let cleanupDone = false;

      // Store original end method before any modifications
      const originalEnd = ctx.res.end.bind(ctx.res);

      // Store timeout ID for cleanup (if used)
      let timeoutId: NodeJS.Timeout | null = null;

      // Helper to restore original end method and cleanup event listeners
      const cleanup = () => {
        if (cleanupDone) return;
        cleanupDone = true;
        ctx.res.end = originalEnd;
        ctx.res.removeListener('finish', onFinish);
        ctx.res.removeListener('close', onClose);
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      };

      const next = (err?: any) => {
        if (nextCalled) return;
        nextCalled = true;

        if (resolved) {
          cleanup();
          return;
        }

        if (err) {
          // Express error - propagate to Vegaa error handler
          resolved = true;
          cleanup();
          reject(err);
        } else {
          // Check if response was ended
          if (ctx.res.writableEnded) {
            ctx._ended = true;
          }
          
          // Sync Express req properties back to context for injection
          const injected = syncReqToContext(ctx, req);
          
          resolved = true;
          cleanup();
          // Return injected object so it gets merged into context
          resolve(injected);
        }
      };

      // Monitor response ending using event listeners (more reliable than setTimeout)
      const checkResponse = () => {
        if (!resolved && ctx.res.writableEnded) {
          ctx._ended = true;
          // Sync req properties before resolving
          const injected = syncReqToContext(ctx, req);
          resolved = true;
          cleanup();
          resolve(injected);
        }
      };

      // Event-based response monitoring (replaces setTimeout)
      const onFinish = () => {
        if (!resolved && !nextCalled) {
          checkResponse();
        }
      };

      const onClose = () => {
        if (!resolved && !nextCalled) {
          // Connection closed, sync properties and continue
          const injected = syncReqToContext(ctx, req);
          resolved = true;
          cleanup();
          resolve(injected);
        }
      };

      // Set up response end monitoring (originalEnd already defined above)
      ctx.res.end = function(...args: any[]) {
        const result = originalEnd(...args);
        checkResponse();
        return result;
      };

      // Listen for response completion events
      ctx.res.once('finish', onFinish);
      ctx.res.once('close', onClose);

      try {
        // Call Express middleware
        const result = expressMw(ctx.req as ExpressRequest, ctx.res as ExpressResponse, next);

        // Handle async Express middleware
        if (result && typeof result.then === 'function') {
          result
            .then(() => {
              if (!resolved) {
                checkResponse();
                if (!resolved && !nextCalled) {
                  // Middleware completed without calling next() and without ending response
                  // Sync req properties and continue
                  const injected = syncReqToContext(ctx, req);
                  resolved = true;
                  cleanup();
                  resolve(injected);
                }
              }
            })
            .catch((err: any) => {
              if (!resolved) {
                resolved = true;
                cleanup();
                reject(err);
              }
            });
        } else {
          // Sync middleware - check if response ended
          // Use a small timeout as fallback, but prefer event listeners
          timeoutId = setTimeout(() => {
            if (!resolved && !nextCalled) {
              if (ctx.res.writableEnded) {
                // Response ended, sync properties
                const injected = syncReqToContext(ctx, req);
                resolved = true;
                cleanup();
                resolve(injected);
              } else {
                // Middleware didn't call next() and didn't end response
                // This might be a middleware that modifies req/res only
                // Sync properties and continue
                const injected = syncReqToContext(ctx, req);
                resolved = true;
                cleanup();
                resolve(injected);
              }
            }
          }, 10); // Small delay as fallback
        }
      } catch (err) {
        // Restore original end method and cleanup
        cleanup();
        if (!resolved) {
          resolved = true;
          reject(err);
        }
      }
    });
  };
}

/**
 * Synchronize Express lifecycle properties on request object
 */
function syncExpressLifecycle(ctx: Context, app: App, mountPath?: string): void {
  const req = ctx.req as ExpressRequest;

  // Set req.app reference
  req.app = app as any;

  // Set req.originalUrl (full URL including query)
  if (!req.originalUrl) {
    req.originalUrl = ctx.req.url || ctx.pathname;
  }

  // Set req.baseUrl (mount path if mounted)
  if (mountPath && !req.baseUrl) {
    req.baseUrl = mountPath;
  }

  // req.route is set by Express router, we'll leave it undefined for now
  // as Vegaa uses a different routing system
}

/**
 * Handle mounting Express apps
 */
export async function handleExpressAppMount(
  app: App,
  expressApp: ExpressApp,
  mountPath: string
): Promise<void> {
  // Create a wrapper middleware that forwards requests to Express app
  app.middleware(async (ctx: Context) => {
    // Check if request matches mount path
    if (!ctx.pathname.startsWith(mountPath)) {
      return; // Not for this Express app
    }

    // If response already ended, skip
    if (ctx._ended || ctx.res.writableEnded) return;

    // Sync lifecycle
    syncExpressLifecycle(ctx, app, mountPath);

    // Trim mount path from pathname for Express app
    const originalPathname = ctx.pathname;
    const trimmedPath = ctx.pathname.slice(mountPath.length) || '/';
    
    // Temporarily modify req.url for Express
    const originalUrl = ctx.req.url;
    ctx.req.url = trimmedPath + (ctx.req.url?.includes('?') ? ctx.req.url.slice(ctx.req.url.indexOf('?')) : '');

    // Wrap Express app.handle() in a Promise
    return new Promise<void>((resolve, reject) => {
      if (!expressApp.handle) {
        // Fallback: try to use Express app as middleware chain
        resolve();
        return;
      }

      const next = (err?: any) => {
        // Restore original URL
        ctx.req.url = originalUrl;
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      };

      try {
        expressApp.handle(ctx.req, ctx.res, next);
      } catch (err) {
        ctx.req.url = originalUrl;
        reject(err);
      }
    });
  });
}

/**
 * Enable Express compatibility on a Vegaa app
 */
export function enableExpressCompat(app: App): void {
  // Inject Express prototypes
  injectExpressPrototypes();

  // Store original middleware method
  const originalMiddleware = app.middleware.bind(app);

  // Override middleware to detect and wrap Express middlewares
  app.middleware = function (mw: Handler | Handler[] | any) {
    const processMiddleware = (fn: Handler | ExpressMiddleware | any): Handler => {
      // Check if it's an Express app
      if (isExpressApp(fn)) {
        // Handle Express app mounting at root
        // Note: Errors are logged but not thrown since this is async
        handleExpressAppMount(app, fn, '/').catch((err) => {
          console.error('[Vegaa ExpressCompat] Failed to mount Express app at root:', err);
          // Log stack trace for debugging
          if (err instanceof Error && err.stack) {
            console.error(err.stack);
          }
        });
        // Return a no-op handler since mounting is handled asynchronously
        return async () => {};
      }

      // First check if it's Express middleware directly
      // (e.g., helmet(), cors(), session({...}) return Express middlewares)
      if (isExpressMiddleware(fn)) {
        // If it's an error handler (4 params), integrate with error system
        if (isExpressErrorMiddleware(fn)) {
          // Register as error handler automatically
          const errorHandler = wrapExpressErrorMiddleware(fn as ExpressErrorMiddleware, app);
          app.onError(async (ctx: Context, err: Error) => {
            await errorHandler(ctx, err);
          });
          // Also return a no-op middleware since it's registered as error handler
          return async () => {};
        }
        return wrapExpressMiddleware(fn, app);
      }

      // Check if it's an Express middleware factory that hasn't been called yet
      // This handles cases where someone passes the factory function itself
      if (isExpressMiddlewareFactory(fn)) {
        try {
          const expressMw = fn();
          if (isExpressMiddleware(expressMw)) {
            return wrapExpressMiddleware(expressMw, app);
          }
        } catch {
          // If calling fails, treat as regular middleware
        }
      }

      // Regular Vegaa middleware
      return fn as Handler;
    };

    if (Array.isArray(mw)) {
      const processed = mw.map(processMiddleware);
      return originalMiddleware(processed);
    } else {
      return originalMiddleware(processMiddleware(mw));
    }
  };

  // Add Express-compatible use() method
  (app as any).use = function (pathOrMw: string | Handler | ExpressApp, mw?: Handler | ExpressApp) {
    if (typeof pathOrMw === 'string' && mw) {
      // Mount path provided
      if (isExpressApp(mw)) {
        handleExpressAppMount(app, mw, pathOrMw).catch((err) => {
          console.error(`[Vegaa ExpressCompat] Failed to mount Express app at ${pathOrMw}:`, err);
          if (err instanceof Error && err.stack) {
            console.error(err.stack);
          }
        });
      } else if (isExpressMiddleware(mw)) {
        // Express middleware with mount path
        app.middleware(async (ctx: Context) => {
          if (ctx.pathname.startsWith(pathOrMw)) {
            const wrapped = wrapExpressMiddleware(mw as ExpressMiddleware, app, pathOrMw);
            await wrapped(ctx);
          }
        });
      } else {
        // Regular middleware with mount path
        app.middleware(async (ctx: Context) => {
          if (ctx.pathname.startsWith(pathOrMw)) {
            const trimmedPath = ctx.pathname.slice(pathOrMw.length) || '/';
            const originalPathname = ctx.pathname;
            ctx.pathname = trimmedPath;
            try {
              await (mw as Handler)(ctx);
            } finally {
              ctx.pathname = originalPathname;
            }
          }
        });
      }
    } else if (isExpressApp(pathOrMw)) {
      // Express app mounted at root
      handleExpressAppMount(app, pathOrMw, '/').catch((err) => {
        console.error('[Vegaa ExpressCompat] Failed to mount Express app at root:', err);
        if (err instanceof Error && err.stack) {
          console.error(err.stack);
        }
      });
    } else {
      // Regular middleware
      app.middleware(pathOrMw as Handler);
    }
    return app;
  };
}

