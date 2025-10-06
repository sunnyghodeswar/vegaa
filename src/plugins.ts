/**
 * plugin helpers and minimal plugin examples.
 *
 * Plugins are plain objects with register(app, opts) method.
 * This file contains isPlugin/isMiddleware helpers and re-exports.
 */

import type { App } from './core/app'

export interface Plugin {
  name?: string
  version?: string
  register(app: App, opts?: Record<string, any>): Promise<void> | void
}

export function isPlugin(obj: any): obj is Plugin {
  return obj && typeof obj.register === 'function'
}

export function isMiddleware(obj: any): obj is Function {
  return typeof obj === 'function'
}

/* Minimal plugin exports (implementations in separate files) */
export { jsonPlugin } from './plugins/json'
export { corsPlugin } from './plugins/cors'
export { bodyParserPlugin } from './plugins/bodyParser'