<p align="center">
  <img src="https://raw.githubusercontent.com/sunnyghodeswar/vegaa/ad0a22231d5ec5667465e85272eef57590c82fc6/assets/vegaa-banner.png" 
       alt="Vegaa Banner" 
       width="100%" />
</p>

# Vegaa


**A modern Node.js framework that makes backend development simple and fast**

[![npm version](https://badge.fury.io/js/vegaa.svg)](https://www.npmjs.com/package/vegaa)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/sunnyghodeswar/vegaa?style=social)](https://github.com/sunnyghodeswar/vegaa)
[![GitHub issues](https://img.shields.io/github/issues/sunnyghodeswar/vegaa)](https://github.com/sunnyghodeswar/vegaa/issues)

---

## 📖 Table of Contents

- [Why Vegaa?](#-why-vegaa)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Core Concepts](#-core-concepts)
- [Middleware System](#-middleware-system)
- [Built-in Plugins](#-built-in-plugins)
- [Features](#-features)
- [Performance](#-performance)
- [CLI & Templates](#-cli--templates)
- [Links & Resources](#-links--resources)

---

## 🎯 Why Vegaa?

Vegaa makes Node.js backend development **simpler** without sacrificing **performance**.

### The Problem with Traditional Frameworks

In Express, you constantly repeat yourself:

```js
app.get('/user/:id', (req, res) => {
  const user = req.user           // Extract from req
  const id = req.params.id        // Extract from params
  res.json({ user, id })          // Manually send response
})
```

### The Vegaa Solution

Just declare what you need — Vegaa handles the rest:

```js
route('/user/:id').get((user, id) => ({ user, id }))
```

**No manual extraction. No `req`/`res` juggling. Just clean, readable code.**

---

## 📦 Installation

### Option 1: Start with Templates (Recommended)

Get started instantly with pre-configured templates:

```bash
npx vegaa-cli create my-app
# or
npx vegaa create my-app
```

Choose from 5 production-ready templates! [See CLI section](#-cli--templates) for details.

### Option 2: Manual Installation

```bash
npm install vegaa
```

**Requirements:** Node.js 18 or higher

---

## 🚀 Quick Start

Create your first API in under 30 seconds:

```js
import { vegaa, route } from 'vegaa'

// Define a simple route
route('/ping').get(() => ({ message: 'pong' }))

// Start the server
await vegaa.startVegaaServer()
```

Visit `http://localhost:4000/ping` and you'll see:

```json
{
  "message": "pong"
}
```

That's it! You just built your first API endpoint.

---

## 💡 Core Concepts

### 1. Automatic Parameter Injection

Vegaa automatically provides values based on parameter names:

```js
// Route parameters are automatically available
route('/users/:id').get((id) => {
  return { userId: id }
})

// Multiple parameters work too
route('/users/:userId/posts/:postId').get((userId, postId) => {
  return { userId, postId }
})
```

**How it works:** Vegaa reads your function parameters and injects the matching values automatically.

### 2. Smart Parameter Grouping

For routes with request bodies (POST, PUT, PATCH), Vegaa groups data to avoid naming conflicts:

```js
route('/users/:id').post((params, body) => {
  return {
    userId: params.id,      // Route parameter
    userData: body          // Request body
  }
})
```

- `params` → Route parameters (`:id`, `:postId`, etc.)
- `body` → Request body data
- `query` → Query string parameters
- Any middleware values you define

---

## 🔗 Middleware System

Middleware is the heart of Vegaa — it creates reusable logic that flows through your app.

### Global Middleware

Runs for **all routes** in your application:

```js
// Authentication middleware
vegaa.middleware(async () => {
  return { user: { id: 1, name: 'John' } }
})

// Logging middleware
vegaa.middleware((pathname) => {
  console.log('Request:', pathname)
})

// Now ALL routes have access to 'user'
route('/profile').get((user) => {
  return { message: `Welcome ${user.name}!` }
})
```

### Route-Specific Middleware

Runs only for **specific routes**:

```js
route('/admin/:id')
  .middleware((params) => {
    // Only runs for /admin/:id
    if (params.id !== '1') {
      throw new Error('Unauthorized')
    }
    return { access: 'granted' }
  })
  .get((params, access) => {
    return { adminId: params.id, access }
  })
```

### Chaining Middleware

Middleware can build on each other — values flow automatically:

```js
vegaa.middleware([
  async () => ({ user: { id: 1, name: 'Bob' } }),
  async (user) => ({ greeting: `Hello ${user.name}` }),
  async (user, greeting) => ({ log: `${greeting} [User ${user.id}]` })
])
route('/welcome')
.middleware(async (user, greeting) => ({ log: `${greeting} [User ${user.id}]` }))
.middleware(async (log) => ({ timestamp: new Date().toISOString() })) 
.get((greeting, log, timestamp) => { return { greeting, log, timestamp } }) 
})
```    

**Key Concept:** Each middleware receives values from previous middleware automatically. Think of it as a pipeline where data flows downstream.

---

## 🔌 Built-in Plugins

Vegaa comes with powerful plugins that are loaded by default:

### Default Plugins (Pre-loaded)

```js
// These are automatically available:
// ✅ jsonPlugin - JSON response helpers
// ✅ bodyParserPlugin - Request body parsing
// ✅ httpClientPlugin - makeRequest() for external APIs
```

### Optional Plugins

#### CORS Plugin

Enable cross-origin requests:

```js
import { vegaa, corsPlugin } from 'vegaa'

await vegaa.plugin(corsPlugin)
```

#### Static File Plugin

Serve HTML, CSS, JavaScript, images:

```js
import { vegaa, staticPlugin } from 'vegaa'

await vegaa.plugin(staticPlugin, {
  root: './public',              // Folder with your files
  prefix: '/assets',             // URL prefix (optional)
  cacheControl: 'public, max-age=3600'
})

// Files in ./public/ → http://localhost:4000/assets/*
```

### Creating Custom Plugins

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

---

## ✨ Features

### 🔥 Response Types

#### JSON (Default)
```js
route('/data').get(() => ({ status: 'success', data: [1, 2, 3] }))
```

#### HTML
```js
import { route, html } from 'vegaa'

route('/').get(() => html('<h1>Welcome!</h1>'))
```

#### Text
```js
import { route, text } from 'vegaa'

route('/health').get(() => text('OK'))
```

### 🌐 HTTP Client (External API Calls)

Built-in HTTP client powered by Undici:

```js
route('/posts').get(async (makeRequest) => {
  const data = await makeRequest()
    .url('https://api.example.com/posts/1')
    .get()
    .json()
  
  return data
})

// POST request
route('/create').post(async (makeRequest, body) => {
  return await makeRequest()
    .url('https://api.example.com/posts')
    .post()
    .headers({ 'Content-Type': 'application/json' })
    .body(body)
    .json()
})
```

**Available Methods:** `.get()`, `.post()`, `.put()`, `.delete()`, `.headers()`, `.body()`, `.json()`, `.text()`, `.buffer()`

### 🎁 Custom Decorators

Add custom values available everywhere:

```js
vegaa.decorate('version', '1.0.0')
vegaa.decorate('db', myDatabaseConnection)

route('/info').get((version) => ({ version }))
```

### ⚙️ Multi-Core Cluster Mode

Use all CPU cores automatically:

```js
await vegaa.startVegaaServer({ 
  port: 4000,
  cluster: true  // Enable multi-core mode
})
```

---

## 🎓 Complete Example

Here's everything working together with **route chaining**:

```js
import { vegaa, route, html } from 'vegaa'

// Global auth middleware
vegaa.middleware(async () => ({ 
  user: { id: 1, name: 'Alice' } 
}))

// Multiple routes with method chaining
route('/users/:id')
  .get((id, user) => ({ viewerId: user.id, profileId: id }))
  .post((params, body, user) => ({ 
    created: true, 
    data: body, 
    authorId: user.id 
  }))
  .delete((id) => ({ deleted: true, userId: id }))

// External API call
route('/external').get(async (makeRequest) => {
  return await makeRequest()
    .url('https://api.example.com/data')
    .get()
    .json()
})

// HTML page
route('/').get(() => html('<h1>Welcome to Vegaa!</h1>'))

await vegaa.startVegaaServer({ port: 4000 })
```

---

## 🚀 Performance

Vegaa is **built for speed** while maintaining clean code.

### Benchmark Results

**Test Environment:** MacBook M3, macOS 26, Node v24.3  
**Tool:** `autocannon -c 100 -d 300 http://localhost:4000/ping`

| Framework | Requests/sec | Latency | Notes |
|-----------|--------------|---------|-------|
| **Vegaa (Cluster)** | **112,774** | **0.09ms** | Multi-core |
| **Vegaa (Single)** | **91,488** | **0.97ms** | Single-core |
| Fastify | 79,852 | 1.01ms | Industry standard |
| Express | 54,339 | 1.06ms | Most popular |

### Visual Comparison

```
Express        ████████████████       54k req/s
Fastify        ████████████████████   79k req/s
Vegaa          ████████████████████████ 91k req/s
Vegaa Cluster  ████████████████████████████ 112k req/s
```

**Result:** Vegaa is 25-30% faster than Fastify and 2x faster than Express.

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| HTTP Server | Node.js `http` | Native, low-overhead |
| Routing | `find-my-way` | Fast path matching |
| JSON | `fast-json-stringify` | Optimized serialization |
| HTTP Client | `undici` | High-performance requests |
| Scaling | Node.js `cluster` | Multi-core support |

---

## 🧰 CLI & Templates

Vegaa CLI provides **5 production-ready templates** to kickstart your project:

### Installation & Usage

```bash
# Install globally
npm install -g vegaa-cli

# Create new project
vegaa create my-app
# or
npx vegaa-cli create my-app
```

### 5 Available Templates

| Template | Description | Live Demos |
|----------|-------------|------------|
| 🌱 **Minimal** | Basic /ping server | [StackBlitz](https://stackblitz.com/github/sunnyghodeswar/vegaa-cli/tree/main/templates/minimal) • [CodeSandbox](https://codesandbox.io/p/sandbox/github/sunnyghodeswar/vegaa-cli/tree/main/templates/minimal) |
| 🔧 **Middleware** | Middleware + Dashboard demo | [StackBlitz](https://stackblitz.com/github/sunnyghodeswar/vegaa-cli/tree/main/templates/middleware) • [CodeSandbox](https://codesandbox.io/p/sandbox/github/sunnyghodeswar/vegaa-cli/tree/main/templates/middleware) |
| 🚀 **CRUD** | JWT Auth + Swagger Docs | [StackBlitz](https://stackblitz.com/github/sunnyghodeswar/vegaa-cli/tree/main/templates/crud) • [CodeSandbox](https://codesandbox.io/p/sandbox/github/sunnyghodeswar/vegaa-cli/tree/main/templates/crud) |
| 🏗️ **Full-Fledge** | Production setup (monitoring, admin, etc.) | [StackBlitz](https://stackblitz.com/github/sunnyghodeswar/vegaa-cli/tree/main/templates/full-fledge) • [CodeSandbox](https://codesandbox.io/p/sandbox/github/sunnyghodeswar/vegaa-cli/tree/main/templates/full-fledge) |
| 🐳 **Docker** | Containerized setup | [StackBlitz](https://stackblitz.com/github/sunnyghodeswar/vegaa-cli/tree/main/templates/docker) • [CodeSandbox](https://codesandbox.io/p/sandbox/github/sunnyghodeswar/vegaa-cli/tree/main/templates/docker) |

**Try instantly:** Launch on your preferred platform — StackBlitz or CodeSandbox — right in the browser, no installation needed!

### Quick Commands

```bash
cd my-app
npm install
npm start        # Start development server
npm run build    # Build for production
```

[📦 View CLI Documentation](https://www.npmjs.com/package/vegaa-cli)

---

## 📚 API Reference

### Creating Routes
```js
route('/path')
  .get(handler)
  .post(handler)
  .put(handler)
  .delete(handler)
```

### Adding Middleware
```js
vegaa.middleware(middlewareFn)              // Global
route('/path').middleware(middlewareFn)     // Route-specific
```

### Starting Server
```js
await vegaa.startVegaaServer({ 
  port: 4000,
  cluster: false 
})
```

---

## 🗺️ Roadmap

| Phase | Features | Status |
|-------|----------|--------|
| **Core Engine** | Context, cluster, plugins | ✅ Complete |
| **Dev Tools** | CLI, validation, caching | 🚧 In Progress |
| **Advanced** | WebSockets, Redis, Streaming | 🧠 Planned |

---

## 🤝 Contributing

Contributions welcome! Fork the repo, make changes, and submit a PR.

**Need help with:** Documentation, bug fixes, performance improvements, new plugins

[Open an Issue](https://github.com/sunnyghodeswar/vegaa/issues) | [View Contributing Guide](https://github.com/sunnyghodeswar/vegaa/blob/main/CONTRIBUTING.md)

---

## 👨‍💻 Author

**Sunny Ghodeswar**  
Senior Full-Stack Developer • Pune, India 🇮🇳

[GitHub](https://github.com/sunnyghodeswar) • [npm](https://www.npmjs.com/~sunnyghodeswar)

---

## 📜 License

[MIT License](LICENSE) — Free for personal and commercial use

---

## 🔗 Links & Resources

- **[⭐ GitHub Repository](https://github.com/sunnyghodeswar/vegaa)** - Star us!
- **[📦 npm Package](https://www.npmjs.com/package/vegaa)** - Install Vegaa
- **[🧰 CLI Tool](https://www.npmjs.com/package/vegaa-cli)** - Project templates
- **[🐛 Report Issues](https://github.com/sunnyghodeswar/vegaa/issues)** - Bug reports & features
- **[📖 Documentation](https://github.com/sunnyghodeswar/vegaa/wiki)** - Full docs

---

<div align="center">

**⚡ Vegaa — Named for velocity. Engineered for developers.**

Built with ❤️ by developers, for developers.

[Get Started](#-installation) | [View Templates](#-cli--templates) | [Star on GitHub](https://github.com/sunnyghodeswar/vegaa) ⭐

</div>