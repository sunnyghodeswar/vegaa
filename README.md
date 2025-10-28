# ⚡ **Vegaa**
> **Named for velocity. Engineered for developers.**

A modern Node.js framework with **automatic parameter injection** — delivering **Express-level simplicity** with **Fastify-level speed** and **Undici-grade networking**.

[![npm version](https://badge.fury.io/js/vegaa.svg)](https://www.npmjs.com/package/vegaa)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/sunnyghodeswar/vegaa?style=social)](https://github.com/sunnyghodeswar/vegaa)
[![GitHub issues](https://img.shields.io/github/issues/sunnyghodeswar/vegaa)](https://github.com/sunnyghodeswar/vegaa/issues)
[![GitHub repo size](https://img.shields.io/github/repo-size/sunnyghodeswar/vegaa)](https://github.com/sunnyghodeswar/vegaa)

---

## 🧠 What is Vegaa?

> Vegaa enters a mature ecosystem (Express, Fastify, Hono...), but focuses on one radical goal —  
> ✨ *less boilerplate, more intent.*

Vegaa eliminates context boilerplate through **context-based parameter injection**.

Middleware can return objects that automatically become available to subsequent middleware and route handlers — injected by matching parameter names.

### 🧾 Traditional Express style
```js
app.get('/user/:id', (req, res) => {
  const user = req.user
  const id = req.params.id
  res.json({ user, id })
})
```

### ⚡ Vegaa style
```js
route('/user/:id').get((user, id) => ({ user,id }))
```

No manual extraction.  
No `req`/`res` juggling.  
Just declare what you need — Vegaa injects the rest.

---

## 💡 Flattened Params & Smart Injection

Vegaa automatically flattens route parameters — no need for `params.id`.

```js
route('/users/:id/posts/:postId').get((id, postId) => ({ id, postId }))
```

The Express equivalent looks like this 👇

```js
app.get('/users/:id/posts/:postId', (req, res) => {
  const id = req.params.id
  const postId = req.params.postId
  res.json({ id, postId })
})
```

For routes with body (POST, PUT, PATCH), Vegaa intelligently groups data to avoid conflicts:

```js
route('/users/:id').post((params, body) => ({
  id: params.id,
  ...body
}))
```

✅ `params` → route parameters  
✅ `body` → parsed request body  
✅ `query`, `user`, and other middleware outputs auto-injected

---

## 🔥 Core Features

- ⚙️ **Context-based injection** — Middleware returns objects; handlers receive them automatically  
- ⚡ **Composable architecture** — Built on `undici`, `find-my-way`, and `fast-json-stringify`  
- 🧠 **Zero-overhead middleware chaining**  
- 🚀 **Cluster-ready** — Multi-core scaling with shared handles  
- 🔌 **Built-in plugins** — CORS, JSON, Body Parser, and HTTP Client (`makeRequest`)  
- 🧾 **TypeScript-native** — Full type inference for injected parameters  
- 💥 **Same performance tier as Fastify**, with cleaner DX  

---

## 📦 Installation

```bash
npm install vegaa
```

---

## ⚡ Quick Start

```js
import { vegaa, route } from 'vegaa'

route('/ping').get(() => ({ msg: 'pong' }))

await vegaa.startVegaaServer()
```

Runs on `http://localhost:4000` by default.

---

## 🧬 Context Injection (Core Concept)

Each middleware can **return an object**.  
Those values automatically flow into all subsequent middleware and route handlers.

```js
vegaa.middleware([
  async () => ({ user: { id: 1, name: 'Sunny' } }),
  async (user) => ({ greeting: `Hello ${user.name}` }),
  async (user, greeting) => ({ log: `${greeting} [${user.id}]` })
])

route('/welcome').get((user, greeting, log) => ({
  message: greeting,
  userId: user.id,
  log
}))
```

✅ **No manual passing.**  
Vegaa injects parameters based on names and preserves full type safety.

---

## 🧱 Route-Specific Middleware

```js
route('/admin/:id')
  .middleware((params) => {
    if (params.id !== '1') throw new Error('Unauthorized')
    return { access: 'granted' }
  })
  .get((params, access) => ({ id: params.id, access }))
```

Middleware declared on a route runs after global middleware.  
All returned objects merge into the context for that route.

---

## 🌐 Built-in HTTP Client Plugin (`makeRequest`)

Vegaa includes a **native, chainable HTTP client** powered by **Undici** —  
the same high-performance engine that powers `fetch()` in Node.

### Example
```js
route('/ping').get(async (makeRequest) => {
  const res = await makeRequest()
    .url('https://jsonplaceholder.typicode.com/posts')
    .post()
    .headers({ 'Content-Type': 'application/json; charset=UTF-8' })
    .body({ title: 'foo', body: 'bar', userId: 1 })
    .json() // auto-parsed JSON response

  return res
})
```

### Supported chain methods:
| Method | Purpose |
|--------|----------|
| `.url(url)` | Set target URL |
| `.get()`, `.post()`, `.put()`, `.delete()` | Set HTTP method |
| `.headers({...})` | Add custom headers |
| `.body({...})` | JSON or form body |
| `.json()` | Parse response as JSON |
| `.text()` / `.buffer()` | Get raw data |

⚡ Powered by **Undici** — 2–3x faster HTTP egress compared to Node’s native `http` client.

---

## 🧠 Real-World Example

```js
route('/profile/:id')
  .middleware(async () => ({ user: await auth() }))
  .middleware(async (user, params, makeRequest) => {
    const profile = await makeRequest()
      .url(`https://api.example.com/users/${params.id}`)
      .get()
      .json()
    return { profile }
  })
  .get((user, profile) => ({
    viewer: user.name,
    viewing: profile.name
  }))
```

---

## ⚙️ Performance

Tested on **MacBook M3**, **macOS 26 (Tahoe Beta)**, **Node v24.3**  
Using `autocannon -c 100 -d 300 http://localhost:4000/ping`

| Framework | Req/sec | Latency (ms) | Mode |
|------------|----------|---------------|-------|
| ⚡ **Vegaa (Cluster)** | **112,774** | **0.09** | Multi-core |
| ⚙️ **Vegaa (Single)** | **91,488** | **0.97** | Single-core |
| 🚀 **Fastify** | 79,852 | 1.01 | Single-core |
| 🐢 **Express** | 54,339 | 1.06 | Single-core |

### 📊 PERFORMANCE (Req/sec)
```
Express        | █████████████████ 54k
Fastify        | ████████████████████████████ 79k
Vegaa          | ███████████████████████████████████ 91k
Vegaa Cluster  | █████████████████████████████████████████████ 112k
```

Vegaa achieves **25–30% higher throughput** than Fastify  
while maintaining equivalent latency and JSON serialization performance.

---

## 🧩 Architecture

| Layer | Technology | Purpose |
|--------|-------------|----------|
| **HTTP Ingress** | Node `http` | Native, low-overhead listener |
| **Routing** | `find-my-way` | Fast trie-based path matching |
| **Serialization** | `fast-json-stringify` | Schema-aware JSON output |
| **Egress (HTTP Client)** | `undici` | High-performance outbound HTTP |
| **Middleware/Context** | Vegaa Core | Automatic dependency injection |
| **Scaling** | `cluster` | Multi-core orchestration |

Each layer is modular and replaceable.  
Vegaa combines *proven primitives* with *next-gen developer experience*.

---

## 🔌 Plugin System

Plugins are type-safe and chainable:

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

**Built-in Plugins:**
- 🧩 `corsPlugin` — Adds CORS headers  
- 🧩 `jsonPlugin` — Adds `.json()` response helper  
- 🧩 `bodyParserPlugin` — Parses incoming request bodies  
- 🧩 `httpClientPlugin` — Adds `makeRequest()` powered by Undici  
- 🧩 `staticPlugin` — Serves static files (HTML, CSS, JS, images)

---

## 🎨 Response Types

Vegaa supports multiple response types through a clean, functional API:

### HTML & Text Responses

```js
import { route, html, text } from 'vegaa'

// HTML response
route('/').get(() => {
  return html('<h1>Hello World</h1>')
})

// Text response
route('/status').get(() => {
  return text('OK')
})

// With dynamic content
route('/users/:id').get((id) => {
  return html(`<h1>User ${id}</h1>`)
})
```

### Static File Serving

Serve static files using the `staticPlugin`:

```js
import { vegaa, staticPlugin } from 'vegaa'

await vegaa.plugin(staticPlugin, {
  root: './public',      // Directory to serve from
  prefix: '/assets',    // URL prefix (optional)
  cacheControl: 'public, max-age=3600'
})

// Files in ./public/ are now served at /assets/*
```

### Mixed Response Types

You can mix HTML, text, and JSON responses in the same app:

```js
route('/api/data').get(() => {
  return { data: 'value' }  // JSON (default)
})

route('/page').get(() => {
  return html('<h1>HTML</h1>')  // HTML
})

route('/health').get(() => {
  return text('OK')  // Plain text
})
```

**Response Helpers:**
- `html(content)` — Return HTML response
- `text(content)` — Return text response  
- Return objects naturally serialize to JSON

---

## 🎁 Decorators

Attach custom values or utilities directly to the app.

```js
vegaa.decorate('version', '0.2.1')

route('/info').get((version) => ({ version }))
```

---

## 🚀 Cluster Mode

```js
await vegaa.startVegaaServer({ cluster: true })
```

- Auto-forks workers for each CPU core  
- Shares port handles across workers  
- Gracefully restarts crashed processes  

True parallel scaling — no configuration required.

---

## 🧭 Roadmap

| Phase | Features | Status |
|--------|-----------|---------|
| **1. Core Engine** | Context, cluster, middleware, plugins | ✅ Complete |
| **2. Developer Tools** | CLI, validation, caching, rate-limiting | 🚧 In progress |
| **3. Advanced Runtime** | WebSockets, Redis, Streaming, Hybrid uWS | 🧠 Planned |

---

## 👨‍💻 Author

Made with ❤️ by **[Sunny Ghodeswar](https://github.com/sunnyghodeswar)**  
Senior Full-Stack Developer • Pune, India 🇮🇳  

[⭐ Star Vegaa on GitHub](https://github.com/sunnyghodeswar/vegaa)  
[📦 View on npm](https://www.npmjs.com/package/vegaa)  
[🧰 Vegaa CLI](https://www.npmjs.com/package/vegaa-cli)  

---

## 📜 License

[MIT](LICENSE)

---
<div align="center">

**⚡ Vegaa — Named for velocity. Engineered for developers.**  
<br/>  
[⭐ GitHub](https://github.com/sunnyghodeswar/vegaa) • [📦 npm](https://www.npmjs.com/package/vegaa) • [🧰 Vegaa CLI](https://www.npmjs.com/package/vegaa-cli)

</div>
