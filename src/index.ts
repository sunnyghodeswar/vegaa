/**
 * src/index.ts
 * ------------------------------------------------------
 * Public API surface for Vegaa.
 *
 * Exposes:
 *  - `vegaa` → global singleton app instance
 *  - `route()` → globally bound route builder
 *  - `vegaa.startVegaaServer()` → sugar for app.startServer()
 *  - Built-in plugins: corsPlugin, jsonPlugin, bodyParserPlugin
 */

import { createApp } from './core/app'
import type { App } from './core/app'

// 🧩 Core Plugins (always bundled)
import { corsPlugin } from './plugins/cors'
import { jsonPlugin } from './plugins/json'
import { bodyParserPlugin } from './plugins/bodyParser'

// ----------------------------------------------------
// 🧠 Global Singleton App
// ----------------------------------------------------

// Create the one-and-only global instance.
// Everything (routes, middleware, plugins) attach to this.
const app = createApp()

// Extend its type so TypeScript knows about the sugar method.
export interface VegaaApp extends App {
  startVegaaServer(opts?: { port?: number; maxConcurrency?: number }): Promise<void>
}

// Attach the sugar method with proper `this` binding.
;(app as VegaaApp).startVegaaServer = async function (
  this: App,
  opts?: { port?: number; maxConcurrency?: number }
) {
  return this.startServer(opts)
}

// ----------------------------------------------------
// 🪄 Global Shorthands
// ----------------------------------------------------

// ✅ Fully bound route() — guaranteed to register under this same app.
export const route = app.route.bind(app)

// ✅ Global reference to the app instance itself.
export const vegaa: VegaaApp = app as VegaaApp

// ----------------------------------------------------
// 🔌 Plugin Exports
// ----------------------------------------------------
export { corsPlugin, jsonPlugin, bodyParserPlugin }

// ----------------------------------------------------
// 🚀 Default Export (so `import vegaa from 'vegaa'` also works)
// ----------------------------------------------------
export default vegaa