import { Handler, Context } from '../core/types'
import { readBody } from '../utils/context'

export function jsonMiddleware(): Handler {
  return async (ctx: Context) => {
    if (ctx.body !== undefined) return

    const method = (ctx.req.method || '').toUpperCase()
    if (method === 'GET' || method === 'HEAD') return

    const contentType = (ctx.req.headers['content-type'] || '') as string
    if (!contentType.includes('application/json')) return

    try {
      const raw = await readBody(ctx.req)
      if (!raw) {
        ctx.body = undefined
        return
      }
      try {
        ctx.body = JSON.parse(raw)
      } catch {
        ctx.body = raw
      }
    } catch {
      ctx.body = undefined
    }
  }
}

export const jsonPlugin = {
  name: 'json',
  version: '1.0.0',
  register: async (app: any) => {
    app.middleware(jsonMiddleware())
  }
}