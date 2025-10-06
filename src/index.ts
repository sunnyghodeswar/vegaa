/**
 * src/index.ts
 * ------------------------------------------------------
 * Public API surface for Vegaa.
 *
 * Exposes:
 *  - `vegaa` → global singleton instance
 *  - `route()` → global route builder
 *  - `vegaa.startVegaaServer()` sugar for `startServer()`
 *  - Built-in plugins: corsPlugin, jsonPlugin, bodyParserPlugin
 */

import { createApp } from './core/app'
import type { App } from './core/app'
import { corsPlugin } from './plugins/cors'
import { jsonPlugin } from './plugins/json'
import { bodyParserPlugin } from './plugins/bodyParser'

// ✅ Explicitly typed global instance with attached startVegaaServer
const baseApp = createApp()

export interface VegaaApp extends App {
  startVegaaServer(opts?: { port?: number; maxConcurrency?: number }): Promise<void>
}

// ✅ Construct fully-typed instance with sugar method
export const vegaa: VegaaApp = Object.assign(baseApp, {
  async startVegaaServer(this: App, opts?: { port?: number; maxConcurrency?: number }) {
    // ✅ Explicit `this` annotation keeps TS happy and runtime stable
    return baseApp.startServer(opts)
  }
})

// ✅ Global route() helper bound to this instance
export const route = (path: string) => vegaa.route(path)

// ✅ Export built-in plugins
export { corsPlugin, jsonPlugin, bodyParserPlugin }

// ✅ Default export for convenience (import vegaa from 'vegaa')
export default vegaa