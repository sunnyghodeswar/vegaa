/**
 * src/router/adapter.ts
 *
 * Optimized Router Adapter for Vegaa ⚡
 * - Correctly typed for find-my-way v8+
 * - Attaches route metadata via the `store` param
 * - Fully compatible with strict TypeScript
 */

import FindMyWay, { HTTPVersion, HTTPMethod } from "find-my-way";
import type { IncomingMessage, ServerResponse } from "http";

/**
 * FindResult: unified output for route matching.
 */
export interface FindResult {
  handler?: (
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>
  ) => void;
  params: Record<string, string>;
  store?: Record<string, any>;
  url?: string;
}

/**
 * Router Adapter
 */
export class Router {
  private r: ReturnType<typeof FindMyWay>;

  constructor() {
    this.r = FindMyWay<HTTPVersion.V1>({
      ignoreTrailingSlash: true,
      allowUnsafeRegex: false,
      defaultRoute: (_req: IncomingMessage, res: ServerResponse) => {
        if (!res.writableEnded) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Not found (router default)" }));
        }
      },
    });
  }

  /**
   * Register route
   * Uses the correct v8 signature: (method, path, handler, store?)
   */
  on(
    method: string,
    path: string,
    store: Record<string, any>,
    handler: (
      req: IncomingMessage,
      res: ServerResponse,
      params: Record<string, string>
    ) => void
  ): void {
    const m = method.toUpperCase() as Uppercase<HTTPMethod>;
    const validMethods: Uppercase<HTTPMethod>[] = [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "PATCH",
      "OPTIONS",
      "HEAD",
    ];

    if (!validMethods.includes(m)) {
      throw new Error(`Invalid HTTP method "${method}" for route ${path}`);
    }

    // ✅ Correct signature: (method, path, handler, store)
    this.r.on(m as HTTPMethod, path, handler as any, store);
  }

  /**
   * Route lookup
   */
  find(method: string, path: string): FindResult {
    const m = method.toUpperCase() as Uppercase<HTTPMethod>;
    const result = this.r.find(m as HTTPMethod, path) as any;

    if (!result || typeof result.handler !== "function") {
      return { params: {}, handler: undefined };
    }

    const safeParams: Record<string, string> = {};
    for (const [key, val] of Object.entries(result.params || {})) {
      if (val !== undefined) safeParams[key] = String(val);
    }

    return {
      handler: result.handler,
      params: safeParams,
      store: result.store ?? undefined,
      url: result.path ?? undefined,
    };
  }

  /**
   * Pretty print (for debug)
   */
  prettyPrint(): string {
    return typeof this.r.prettyPrint === "function" ? this.r.prettyPrint() : "";
  }
}