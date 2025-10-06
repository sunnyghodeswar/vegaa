# ⚡ **Vegaa**
> **Named for velocity. Engineered for developers.**

A modern Node.js framework with automatic parameter injection — delivering Express-level simplicity with Fastify-level speed.

---

🚧 **Status:** *Developer Preview (v0.2.1)*  
> Core engine stable. APIs finalized for routing, middleware, and cluster modules. Production release coming soon.

---

## What is Vegaa?

> Vegaa enters a mature ecosystem (Express, Fastify, Hono...), but focuses on one radical goal — *less boilerplate, more intent*.

Vegaa eliminates boilerplate through **context-based parameter injection**.

Middleware functions return objects that become available to subsequent middleware and route handlers — automatically injected by matching parameter names.

**Traditional approach:**
```js
app.get('/user/:id', (req, res) => {
  const user = req.user
  const id = req.params.id
  res.json({ user, id })
})
```

**Vegaa approach:**
```js
route('/user/:id').get((user, params) => ({
  user,
  id: params.id
}))
```

No manual extraction. No context juggling. Just declare what you need.

---

## Core Features

- **Context-based injection** — Middleware returns objects; handlers receive them as parameters
- **Composable architecture** — Built on `undici`, `find-my-way`, and `fast-json-stringify`
- **Cluster-ready** — Multi-core scaling with one flag
- **TypeScript-native** — Full type inference and IntelliSense
- **Zero-config plugins** — CORS, JSON, body parsing enabled by default

---

## Installation

```bash
npm install vegaa
```

---

## Quick Start

```js
import { vegaa, route } from 'vegaa'

route('/ping').get(() => ({ msg: 'pong' }))

await vegaa.startVegaaServer()
```

Runs on `http://localhost:4000` by default.

---

## How Context Injection Works

Each middleware can **return an object**. Those values become available to all subsequent middleware and route handlers through parameter injection:

```js
// Middleware returns objects → added to context
vegaa.middleware([
  async () => ({ user: { id: 1, name: 'Sunny' } }),
  async (user) => ({ greeting: `Hello ${user.name}` }),
  async (user, greeting) => ({ log: `${greeting} [${user.id}]` })
])

// Route handler receives injected parameters
route('/welcome').get((user, greeting, log) => ({
  message: greeting,
  userId: user.id,
  log
}))
```

**How it works:**
1. First middleware returns `{ user }`
2. Second middleware receives `user`, returns `{ greeting }`
3. Third middleware receives both, returns `{ log }`
4. Route handler receives all three — automatically

No manual wiring. Vegaa matches parameter names to context values. Full TypeScript inference ensures all injected parameters are strongly typed in editors.

---

## Route-Specific Middleware

```js
route('/admin/:id')
  .middleware((params) => {
    if (params.id !== '1') throw new Error('Unauthorized')
    return { access: 'granted' }
  })
  .get((params, access) => ({ 
    id: params.id,
    access
  }))
```

Route middleware runs after global middleware. All returned objects merge into context.

---

## Real-World Example (Auth + DB + Params)

```js
route('/profile/:id')
  .middleware(async () => ({ user: await auth() }))
  .middleware(async (user, params) => ({ profile: await db.getUser(params.id) }))
  .get((user, profile) => ({
    viewer: user.name,
    viewing: profile.name
  }))
```

No `req.user`, no `req.params`, no manual context passing. Just clean function composition.

---

## Performance

Tested on MacBook M3, macOS 26 (Tahoe) beta, Node v24.3  
`autocannon -c 100 -d 300 http://localhost:4000/ping`

| Framework | Req/s | Latency (ms) | Mode |
|-----------|-------|--------------|------|
| **Vegaa (Cluster)** | **72,783** | **1.06** | Multi-core |
| **Vegaa (Single)** | **70,751** | **1.02** | Single-core |
| Fastify | 69,078 | 1.02 | Single-core |
| Express | 66,882 | 1.03 | Single-core |

Vegaa performs comparably to Fastify while delivering cleaner syntax through parameter injection.

---

## Architecture

Vegaa is built on battle-tested Node.js primitives:

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **HTTP Ingress** | Node `http` | Zero-overhead request handling |
| **HTTP Egress** | `undici` | Official Node.js HTTP client (2-3x faster) |
| **Routing** | `find-my-way` | Fastify's trie router (O(log n) lookup) |
| **Serialization** | `fast-json-stringify` | Schema-based JSON (2-3x faster) |
| **Innovation** | **Parameter injection** | Context-based handler composition |

The performance comes from proven components. The developer experience comes from how they're composed.

---

## Plugins

```js
const loggerPlugin = {
  name: 'logger',
  version: '1.0.0',
  async register(app) {
    app.middleware((pathname) => {
      console.log('→', pathname)
    })
  }
}

await vegaa.plugin(loggerPlugin)
```

**Default plugins** (CORS, JSON, body parser) are pre-registered and can be customized:

```js
await vegaa.plugin(corsPlugin, { 
  origin: 'https://example.com' 
})
```

---

## Decorators

```js
vegaa.decorate('version', '0.2.1')

route('/info').get((version) => ({ version }))
```

---

## Cluster Mode

```js
await vegaa.startVegaaServer({ cluster: true })
```

Automatically spawns workers for each CPU core with graceful restart on crashes.

---

## Roadmap

**Phase 1 – Core Engine** ✅  
Context system, middleware composition, cluster orchestration, plugin architecture

**Phase 2 – Developer Tools** 🚧  
Static files, CLI, rate limiting, request validation, caching

**Phase 3 – Scale & Real-Time** 🧠  
WebSockets, Redis integration, streaming API, advanced auth

---

## Author

Built by [Sunny](https://github.com/yourusername)

---

## License

[MIT](LICENSE)

---

> **Named for velocity. Engineered for developers.** ⚡