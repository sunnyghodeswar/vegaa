import type { App } from './app'

export interface Plugin {
  name?: string
  version?: string
  /**
   * Register function called with the app and optional options.
   */
  register(app: App, opts?: Record<string, any>): Promise<void> | void
}

export function isPlugin(obj: any): obj is Plugin {
  return obj && typeof obj.register === 'function'
}

export function isMiddleware(obj: any): obj is Function {
  return typeof obj === 'function'
}