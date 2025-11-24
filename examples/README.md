# Vegaa Pure JavaScript Examples

This directory contains pure JavaScript examples demonstrating Vegaa's features.

## Examples

### 1. **basic.js** - Basic Usage
Simple routes and parameter injection.

```bash
node examples/basic.js
```

**Features:**
- Simple route definition
- Route parameters
- Default JSON responses

---

### 2. **middleware.js** - Middleware System
Global and route-specific middleware.

```bash
node examples/middleware.js
```

**Features:**
- Global middleware
- Chained middleware
- Route-specific middleware
- Context injection

---

### 3. **crud.js** - Full CRUD Operations
Complete CRUD API with smart parameter injection.

```bash
node examples/crud.js
```

**Features:**
- GET, POST, PUT, DELETE operations
- Smart parameter flattening (GET/DELETE)
- Grouped params + body (POST/PUT)
- Body parser plugin
- CORS plugin

---

### 4. **response-helpers.js** - Response Types
HTML, text, and JSON responses.

```bash
node examples/response-helpers.js
```

**Features:**
- HTML responses (`html()`)
- Text responses (`text()`)
- JSON responses (default)
- Dynamic content
- Static file serving

---

### 5. **express-middleware.js** - Express Compatibility
Using Express middleware with Vegaa's minimal API.

```bash
node examples/express-middleware.js
```

**Features:**
- Express middleware integration
- Path-prefixed middleware
- Express error handlers
- Preserves Vegaa's minimal API

---

### 6. **http-client.js** - External API Calls
Making HTTP requests to external APIs.

```bash
node examples/http-client.js
```

**Features:**
- GET, POST, PUT, DELETE requests
- Headers and body configuration
- Multiple concurrent requests
- JSON, text, buffer responses

**Note:** This example imports `httpClientPlugin` directly from the plugin file:
```javascript
const { httpClientPlugin } = require('../dist/cjs/plugins/httpClient.js')
```

---

## Running Examples

1. **Build the project first:**
   ```bash
   npm run build
   ```

2. **Run any example:**
   ```bash
   node examples/basic.js
   ```

3. **Test the endpoints:**
   ```bash
   curl http://localhost:4000/ping
   ```

---

## Common Patterns

### Basic Route
```javascript
const { vegaa, route } = require('../dist/cjs/index.js')

route('/ping').get(() => {
  return { message: 'pong' }
})

await vegaa.startVegaaServer({ port: 4000 })
```

### Middleware
```javascript
vegaa.middleware(() => ({ user: { id: 1 } }))

route('/profile').get((user) => {
  return { user }
})
```

### Express Middleware
```javascript
const { enableExpressCompat } = require('../dist/cjs/index.js')

enableExpressCompat(vegaa)
vegaa.useExpressMiddleware(helmet())
```

### Response Helpers
```javascript
const { html, text } = require('../dist/cjs/index.js')

route('/').get(() => html('<h1>Hello</h1>'))
route('/status').get(() => text('OK'))
```

### HTTP Client Plugin
```javascript
const { vegaa, route } = require('../dist/cjs/index.js')
const { httpClientPlugin } = require('../dist/cjs/plugins/httpClient.js')

await vegaa.plugin(httpClientPlugin)
route('/posts').get(async (makeRequest) => {
  return await makeRequest()
    .url('https://api.example.com/posts')
    .get()
    .json()
})
```

---

## Requirements

- Node.js 18+
- Built Vegaa package (`npm run build`)

---

## Notes

- All examples use port 4000 by default
- Examples use CommonJS (`require`) for compatibility
- Make sure to build the project before running examples
- Some examples require external APIs (http-client.js)

