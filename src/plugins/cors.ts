import { Handler, Context } from '../core/types'

export type CorsOptions = {
  origin?: string | ((reqOrigin?: string) => string | undefined)
  methods?: string
  allowedHeaders?: string
  allowCredentials?: boolean
  maxAge?: number
}

const DEFAULTS: Required<CorsOptions> = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Content-Type,Authorization',
  allowCredentials: false,
  maxAge: 86400
}

export function corsMiddleware(opts?: CorsOptions): Handler {
  const conf = { ...DEFAULTS, ...(opts ?? {}) }

  return async (ctx: Context) => {
    const reqOrigin = (ctx.req.headers['origin'] as string) || ''
    let originHeader: string
    if (typeof conf.origin === 'function') originHeader = conf.origin(reqOrigin) ?? ''
    else originHeader = conf.origin

    if (originHeader) ctx.res.setHeader('Access-Control-Allow-Origin', originHeader)
    ctx.res.setHeader('Access-Control-Allow-Methods', conf.methods)
    ctx.res.setHeader('Access-Control-Allow-Headers', conf.allowedHeaders)
    if (conf.allowCredentials) ctx.res.setHeader('Access-Control-Allow-Credentials', 'true')
    if (typeof conf.maxAge === 'number' && conf.maxAge > 0) ctx.res.setHeader('Access-Control-Max-Age', String(conf.maxAge))

    if ((ctx.req.method || '').toUpperCase() === 'OPTIONS') {
      ctx.res.statusCode = 204
      ctx._ended = true
      ctx.res.end()
    }
  }
}

export const corsPlugin = {
  register: async (app: any) => {
    app.middleware(corsMiddleware())
  }
}