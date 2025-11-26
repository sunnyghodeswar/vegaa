# API Reference

Complete API reference for Vegaa.

## Core API

### `vegaa`

The global Vegaa application instance.

```js
import { vegaa } from 'vegaa'
```

#### Methods

##### `vegaa.startVegaaServer(options?)`

Starts the Vegaa server.

```js
await vegaa.startVegaaServer({
  port: 4000,      // Port number (default: 4000)
  cluster: false   // Enable cluster mode (default: false)
})
```

##### `vegaa.middleware(middleware)`

Adds global middleware.

```js
vegaa.middleware(() => ({ user: { id: 1 } }))
vegaa.middleware([middleware1, middleware2])
```

##### `vegaa.plugin(plugin, options?)`

Registers a plugin.

```js
await vegaa.plugin(corsPlugin)
await vegaa.plugin(staticPlugin, { root: './public' })
```

### `route(path)`

Creates a route builder.

```js
import { route } from 'vegaa'

route('/users/:id')
  .get(handler)
  .post(handler)
  .put(handler)
  .delete(handler)
  .middleware(middleware)
```

#### HTTP Methods

- `.get(handler)` - GET request
- `.post(handler)` - POST request
- `.put(handler)` - PUT request
- `.patch(handler)` - PATCH request
- `.delete(handler)` - DELETE request
- `.options(handler)` - OPTIONS request
- `.head(handler)` - HEAD request

#### Middleware

- `.middleware(middleware)` - Route-specific middleware

## Express Compatibility

### `enableExpressCompat(app)`

Enables Express middleware compatibility.

```js
import { enableExpressCompat } from 'vegaa'

enableExpressCompat(vegaa)
```

### `vegaa.useExpressMiddleware(middleware)`

Uses Express middleware (after enabling compatibility).

```js
vegaa.useExpressMiddleware(helmet())
vegaa.useExpressMiddleware('/api', cors())
```

## Response Helpers

### `html(content)`

Returns HTML response.

```js
import { html } from 'vegaa'

route('/').get(() => html('<h1>Hello</h1>'))
```

### `text(content)`

Returns text response.

```js
import { text } from 'vegaa'

route('/status').get(() => text('OK'))
```

## Plugins

### `corsPlugin`

CORS support plugin.

```js
import { corsPlugin } from 'vegaa'

await vegaa.plugin(corsPlugin)
```

### `bodyParserPlugin`

Body parsing plugin.

```js
import { bodyParserPlugin } from 'vegaa'

await vegaa.plugin(bodyParserPlugin)
```

### `jsonPlugin`

JSON formatting plugin.

```js
import { jsonPlugin } from 'vegaa'

await vegaa.plugin(jsonPlugin)
```

### `staticPlugin`

Static file serving plugin.

```js
import { staticPlugin } from 'vegaa'

await vegaa.plugin(staticPlugin, {
  root: './public',
  prefix: '/assets'
})
```

### `httpClientPlugin`

HTTP client plugin.

```js
import { httpClientPlugin } from 'vegaa'

await vegaa.plugin(httpClientPlugin, { timeout: 5000 })
```

## Handler Functions

Handler functions receive parameters based on their names:

- Route parameters: `id`, `userId`, etc.
- Query parameters: `query`
- Request body: `body`
- Route params object: `params`
- Middleware values: Any middleware-provided value names

```js
route('/users/:id').get((id, query, user) => {
  // id → route parameter
  // query → query string object
  // user → from middleware
})
```

## Error Handling

Throw errors in handlers or middleware:

```js
route('/protected').get(() => {
  throw new Error('Unauthorized')
})
```

## TypeScript Support

Vegaa includes full TypeScript support:

```ts
import { vegaa, route } from 'vegaa'

route('/users/:id').get((id: string) => {
  return { userId: id }
})
```

