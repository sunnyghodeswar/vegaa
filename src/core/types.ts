import http from 'http'

/**
 * EnhancedServerResponse: small set of helpers we attach to ServerResponse.
 * These are minimal and synchronous where possible to avoid extra allocations.
 */
export type EnhancedServerResponse = http.ServerResponse & {
  json?: (data: any) => EnhancedServerResponse
  send?: (data: any) => EnhancedServerResponse
  status?: (code: number) => EnhancedServerResponse
  type?: (mime: string) => EnhancedServerResponse
  // _ctxRef is an internal back-reference for helpers
  _ctxRef?: Context
}

/**
 * Context: the per-request context available to handlers and middleware.
 * Keep it tiny and predictable.
 */
export type Context<B = any, Q = Record<string, any>, P = Record<string, string>> = {
  req: http.IncomingMessage
  res: EnhancedServerResponse
  body?: B
  query: Q
  params: P
  pathname: string
  user?: any
  _ended?: boolean
}

/**
 * Handler: either ctx-style or smart arg-list style.
 * Smart arg mapping is performed using compileArgBuilder in utils/params.ts
 */
export type Handler<B = any, Q = any, P = any> =
  | ((ctx: Context<B, Q, P>) => Promise<any> | any)
  | ((...args: any[]) => Promise<any> | any)

export interface MiddlewareEntry {
  fn: Handler
  paramNames?: string[]
  argBuilder?: (ctx: Context) => any[]
}

export interface Route {
  method: string
  path: string
  handler: Handler
  mws: MiddlewareEntry[]
  cfg: Record<string, any> | null
  paramNames?: string[]
  argBuilder?: (ctx: Context) => any[]
}