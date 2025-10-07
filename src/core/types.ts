  import http from 'http'
  import type { request } from 'undici'
  /**
   * EnhancedServerResponse:
   * Small set of helpers we attach to ServerResponse.
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
   * Context:
   * The per-request context available to handlers and middleware.
   * Keep it minimal, deterministic, and predictable.
   */
  export type Context<
    B = any,
    Q = Record<string, any>,
    P = Record<string, string>
  > = {
    req: http.IncomingMessage
    res: EnhancedServerResponse
    body?: B
    query: Q
    params: P
    pathname: string
    user?: any
    makeRequest: () => MakeRequestBuilder 
    
    _ended?: boolean

    /**
     * 🔥 Optional Undici utilities (from httpClientPlugin)
     * These get injected dynamically via app.decorate()
     */
    fetch?: (
      url: string,
      opts?: {
        method?: string
        headers?: Record<string, string>
        body?: any
        json?: boolean
      }
    ) => Promise<any>

    request?: typeof request
  }

  /**
   * Handler:
   * Either ctx-style or smart arg-list style.
   * Smart arg mapping is performed using compileArgBuilder() in utils/params.ts
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
    serializer?: (data: any) => string
  }
export type MakeRequestBuilder = {
  url: (url: string) => MakeRequestBuilder
  method: (m: string) => MakeRequestBuilder
  get: () => MakeRequestBuilder
  post: () => MakeRequestBuilder
  put: () => MakeRequestBuilder
  delete: () => MakeRequestBuilder
  patch: () => MakeRequestBuilder
  headers: (h: Record<string, string>) => MakeRequestBuilder
  body: (b: any) => MakeRequestBuilder
  timeout: (ms: number) => MakeRequestBuilder
  json: <T = any>() => Promise<T>
  text: () => Promise<string>
  buffer: () => Promise<Buffer>
}



