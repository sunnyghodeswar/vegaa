import { App } from './app'
import { Handler } from './types'

export class RouteBuilder {
  private mws: Handler[] = []
  constructor(private app: App, private path: string) {}

  middleware(...m: Handler[]) {
    this.mws.push(...m)
    return this
  }

  get(cfgOrHandler: any, handler?: Handler) {
    const cfg = typeof cfgOrHandler === 'function' ? null : cfgOrHandler ?? null
    const fn = typeof cfgOrHandler === 'function' ? cfgOrHandler : handler!
    this.app.registerRoute('GET', this.path, fn, this.mws, cfg)
    return this
  }

  post(cfgOrHandler: any, handler?: Handler) {
    const cfg = typeof cfgOrHandler === 'function' ? null : cfgOrHandler ?? null
    const fn = typeof cfgOrHandler === 'function' ? cfgOrHandler : handler!
    this.app.registerRoute('POST', this.path, fn, this.mws, cfg)
    return this
  }

  put(cfgOrHandler: any, handler?: Handler) {
    const cfg = typeof cfgOrHandler === 'function' ? null : cfgOrHandler ?? null
    const fn = typeof cfgOrHandler === 'function' ? cfgOrHandler : handler!
    this.app.registerRoute('PUT', this.path, fn, this.mws, cfg)
    return this
  }

  delete(cfgOrHandler: any, handler?: Handler) {
    const cfg = typeof cfgOrHandler === 'function' ? null : cfgOrHandler ?? null
    const fn = typeof cfgOrHandler === 'function' ? cfgOrHandler : handler!
    this.app.registerRoute('DELETE', this.path, fn, this.mws, cfg)
    return this
  }
}