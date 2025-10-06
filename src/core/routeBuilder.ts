import { App } from './app'
import type { Handler } from './types'

export class RouteBuilder {
  private mws: Handler[] = []

  constructor(private app: App, private path: string) {}

  /**
   * Register middleware for this route. Accepts variadic handlers.
   */
  middleware(...m: Handler[]) {
    this.mws.push(...m)
    return this
  }

  private _register(method: string, cfgOrHandler?: any, handler?: Handler) {
    const cfg = typeof cfgOrHandler === 'function' ? null : cfgOrHandler ?? null
    const fn = typeof cfgOrHandler === 'function' ? cfgOrHandler : handler!
    this.app.registerRoute(method, this.path, fn, this.mws, cfg)
    return this
  }

  get(cfgOrHandler?: any, handler?: Handler) { return this._register('GET', cfgOrHandler, handler) }
  post(cfgOrHandler?: any, handler?: Handler) { return this._register('POST', cfgOrHandler, handler) }
  put(cfgOrHandler?: any, handler?: Handler) { return this._register('PUT', cfgOrHandler, handler) }
  delete(cfgOrHandler?: any, handler?: Handler) { return this._register('DELETE', cfgOrHandler, handler) }
}