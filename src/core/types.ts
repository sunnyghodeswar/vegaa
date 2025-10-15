import http from "http";
import type { request } from "undici";

/**
 * 🧩 EnhancedServerResponse
 * Minimal extension to Node's ServerResponse for convenience.
 */
export type EnhancedServerResponse = http.ServerResponse & {
  json?: (data: any) => EnhancedServerResponse;
  send?: (data: any) => EnhancedServerResponse;
  status?: (code: number) => EnhancedServerResponse;
  type?: (mime: string) => EnhancedServerResponse;

  /** Internal back-reference for helper chaining */
  _ctxRef?: Context;
};

/**
 * 🧠 Context
 * The per-request context passed to all Vegaa handlers & middleware.
 *
 * ✅ Type-safe core fields
 * ✅ Generic support for Body (B), Query (Q), and Params (P)
 * ✅ Dynamic safe extension (index signature)
 */
export type Context<
  B = any,
  Q = Record<string, any>,
  P = Record<string, string>
> = {
  req: http.IncomingMessage;
  res: EnhancedServerResponse;
  pathname: string;

  /** Query params (?key=value) */
  query: Q;

  /** Route params (/users/:id) */
  params: P;

  /** Parsed request body (from bodyParser) */
  body?: B;

  /** Whether the request has already been ended */
  _ended?: boolean;

  /** Authenticated user or injected data */
  user?: any;

  /** Outbound HTTP builder (from httpClientPlugin) */
  makeRequest: () => MakeRequestBuilder;

  /**
   * 🪶 Optional Undici utilities (from httpClientPlugin)
   * Available when the plugin is registered.
   */
  fetch?: (
    url: string,
    opts?: {
      method?: string;
      headers?: Record<string, string>;
      body?: any;
      json?: boolean;
    }
  ) => Promise<any>;

  /** Direct access to Undici request() */
  request?: typeof request;

  /**
   * 🧩 Dynamic Extensions
   * Allows middleware/bodyParser to safely inject new properties
   * (e.g., ctx.user, ctx.token, ctx.db, etc.)
   */
  [key: string]: unknown;
};

/**
 * ⚙️ Handler
 * A Vegaa-compatible function that either:
 *  - Receives the full Context, or
 *  - Declares destructured arguments (auto-injected by param builder)
 */
export type Handler<B = any, Q = any, P = any> =
  | ((ctx: Context<B, Q, P>) => Promise<any> | any)
  | ((...args: any[]) => Promise<any> | any);

/**
 * 🧱 MiddlewareEntry
 * Compiled middleware function with argument metadata.
 */
export interface MiddlewareEntry {
  fn: Handler;
  paramNames?: string[];
  argBuilder?: (ctx: Context) => any[];
}

/**
 * 🧭 Route
 * Fully compiled route definition with middleware and schema support.
 */
export interface Route {
  method: string;
  path: string;
  handler: Handler;
  mws: MiddlewareEntry[];
  cfg: Record<string, any> | null;
  paramNames?: string[];
  argBuilder?: (ctx: Context) => any[];
  serializer?: (data: any) => string;
}

/**
 * 🌐 MakeRequestBuilder
 * Builder pattern for egress HTTP calls using Undici.
 */
export type MakeRequestBuilder = {
  url: (url: string) => MakeRequestBuilder;
  method: (m: string) => MakeRequestBuilder;
  get: () => MakeRequestBuilder;
  post: () => MakeRequestBuilder;
  put: () => MakeRequestBuilder;
  delete: () => MakeRequestBuilder;
  patch: () => MakeRequestBuilder;
  headers: (h: Record<string, string>) => MakeRequestBuilder;
  body: (b: any) => MakeRequestBuilder;
  timeout: (ms: number) => MakeRequestBuilder;
  json: <T = any>() => Promise<T>;
  text: () => Promise<string>;
  buffer: () => Promise<Buffer>;
};