# ⚡ **Vegaa**

> **Named for velocity. Engineered for developers.**

Next-gen, high-performance Node.js framework built for speed and simplicity.

---

🚧 **Status:** *Currently in active development (v0.0.1-dev).*  
> This is an **early developer preview** — not production-ready yet.  
> Expect rapid updates, API refinements, and potential breaking changes before v1.0 release.

---

## 🚀 Why Vegaa?

Vegaa is a modern Node.js web framework built from scratch — engineered for **extreme performance**, **zero boilerplate**, and **maximum developer happiness**.

It combines the **speed of Fastify**, the **simplicity of Express**, and adds a **touch of modern DX magic**.

---

## 🔑 Core Features

✅ **Blazing Fast** — Built directly on Node's native HTTP layer with zero overhead  
✅ **Cluster Mode** — Utilizes all CPU cores automatically for high concurrency  
✅ **Smart Middleware System** — Simple, async, and context-aware  
✅ **Built-in Plugins** — CORS, JSON parser, body parser — ready to go  
✅ **Cache-Aware Routes** — Define TTLs for routes with a single line  
✅ **Dynamic Routing** — Supports params (`/movie/:id`) and wildcards (`/files/*`)  
✅ **TypeScript First** — Fully typed with clean developer ergonomics  
✅ **Decorators & Hooks** — Extend Vegaa elegantly without monkey-patching

---

## 🧱 Installation

```bash
npm install vegaa
```

or for the latest dev preview:

```bash
npm install vegaa@dev
```

---

## 🧩 Minimal Example

```js
import { createApp } from 'vegaa'

const app = createApp()

app('/').get(() => ({ msg: 'Hello Vegaa 🚀' }))

app.startServer()
```

Output:
```bash
🚀 Vegaa listening on port 4000 (pid 12345)
```

**That's it.** No boilerplate. No config files. Just code.

### 🎯 What You Get Out of the Box

- **Default Port:** `4000` (configurable via `{ port: 3000 }`)
- **Auto-enabled Plugins:** CORS, JSON parser, body parser (pre-configured)
- **Cluster Mode:** Set `CLUSTER=true` env variable to utilize all CPU cores
- **Built-in Features:** Route caching, middleware support, decorators, and hooks — all ready to use

---

## ⚙️ Complete Example

```js
import { createApp, corsPlugin, jsonPlugin, bodyParserPlugin } from 'vegaa'

const app = createApp()

// 🔌 Register plugins
await app.plugin(corsPlugin)
await app.plugin(jsonPlugin)
await app.plugin(bodyParserPlugin, { limit: '2mb' })

// 🌍 Global middleware
app.middleware(() => ({
  user: { id: 1, name: 'Alex' }
}))

// ⚡ Routes
app('/api/speed')
  .get((user) => ({ 
    msg: `⚡ Speed check for ${user?.name}`,
    metrics: {
      latency: '< 1ms',
      throughput: '100k req/s',
      status: 'blazing fast'
    }
  }))
  .post((body, user) => ({
    msg: '🚀 Performance test initiated',
    testData: body,
    initiatedBy: user,
    eta: 'instant'
  }))

// 🚀 Start server
await app.startServer({ port: 4000 })
```

Output:
```bash
🚀 Vegaa listening on port 4000 (pid 12345)
```

---

## 🔥 Example Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/ping` | GET | Health check |
| `/api/speed/:test` | GET | Performance metrics by test ID |
| `/api/benchmark` | POST | Run speed benchmark |
| `/files/*` | GET | Wildcard file route |
| `/api/status` | GET | Cached route example |

---

## 🧩 Middleware Magic

Middleware in Vegaa is *simple and expressive*:

```js
// Global middleware
app.middleware((res) => {
  res.setHeader('X-Powered-By', 'Vegaa')
})

// Route-level middleware with context
app('/secure')
  .middleware((user) => {
    if (!user) throw new Error('Unauthorized')
  })
  .get((user, res) => {
    res.json({ msg: `Welcome ${user.name}` })
  })
```

---

## 🧰 Plugins

Vegaa supports plugin-style extensions — built just like Fastify or Hono.

Example:

```js
export const myPlugin = {
  name: 'logger',
  version: '1.0.0',
  async register(app) {
    app.middleware((req) => console.log('Incoming:', req.url))
  }
}

await app.plugin(myPlugin)
```

---

## ⚡ Advanced Features (Built-in)

| Feature | Description |
|----------|--------------|
| 🧩 **`app.decorate()`** | Extend the app with custom properties or methods |
| 🧱 **`app.plugin()`** | Register plugins (async supported) |
| 🌀 **Cluster Mode** | Enable multi-core scaling with `CLUSTER=true` |
| 🚀 **Smart Context** | Handler params auto-mapped: `(body, res, query)` etc. |
| 💾 **Cache TTL** | Route-level caching with `{ cacheTTL: 5000 }` |
| 🧠 **Hooks** | `onRequest`, `onResponse`, `onError` available (internal use) |

---

## ⚡ Performance Comparison (5s, 100 Connections)

| Framework | Avg Req/s | Avg Latency (ms) | Throughput (MB/s) | Mode |
|------------|------------|------------------|-------------------|------|
| **Vegaa (Cluster)** | **115,885** | **0.10** | **21.4 MB/s** | Multi-core |
| **Vegaa (Single-Core)** | 83,200 | 1.02 | 15.4 MB/s | Single-core |
| **Fastify** | 75,000 | 1.03 | 15.5 MB/s | Single-core |
| **Express** | 55,500 | 1.07 | 14.9 MB/s | Single-core |

> Vegaa outperformed both Fastify and Express, achieving up to **2× the throughput** of Express  
> and **~40% faster response times** under the same load conditions.

---

## 🧑‍💻 Author

Created by **Sunny Ghodeswar** | Pune, India 🇮🇳

---

## 🗺️ Roadmap

**Phase 1 – Core Engine** ✅ Completed  
**Phase 2 – Developer Power-Ups** 🚧 In Progress (rate limiter, static files, CLI tools)  
**Phase 3 – Scale & Real-Time** 🧠 Planned (WebSockets, Redis, Auth, config system)

---

## ⚖️ License

[MIT](LICENSE)

---

> *"Named for velocity. Engineered for developers ⚡"*