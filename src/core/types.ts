import http from 'http'

export type Context<B = any, Q = Record<string, any>, P = Record<string, any>> = {
  req: http.IncomingMessage
  res: http.ServerResponse & { send?: (data: any) => void }
  body: B
  query: Q
  params: P
  pathname: string
  user?: any
  _ended?: boolean
}

/** Handler: either ctx-style or smart arg list (runtime handles mapping) */
export type Handler<B = any, Q = any, P = any> =
  | ((ctx: Context<B, Q, P>) => Promise<any> | any)
  | ((...args: any[]) => Promise<any> | any)

/** Middleware entry used internally: stores fn + precompiled argBuilder */
export interface MiddlewareEntry {
  fn: Handler
  paramNames?: string[]
  argBuilder?: (ctx: Context) => any[]
}

/** Route descriptor */
export interface Route {
  method: string
  path: string
  handler: Handler
  mws: MiddlewareEntry[]
  cfg: Record<string, any> | null
  paramNames?: string[]
  argBuilder?: (ctx: Context) => any[]
}