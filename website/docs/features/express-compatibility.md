# Express Middleware Compatibility

Vegaa maintains its minimalist DNA while allowing you to use existing Express middleware seamlessly.

## Why Express Compatibility?

You might have existing Express middleware you want to use, or prefer certain Express packages. Vegaa lets you use them without compromising its clean, context-based API.

## Enabling Express Compatibility

```js
import { vegaa, enableExpressCompat } from 'vegaa'

// Enable Express compatibility
enableExpressCompat(vegaa)

// Now you can use Express middleware
vegaa.useExpressMiddleware(helmet())
```

## Using Express Middleware

### Global Middleware

```js
import { vegaa, enableExpressCompat } from 'vegaa'
import helmet from 'helmet'
import cors from 'cors'

enableExpressCompat(vegaa)

// Use Express middleware globally
vegaa.useExpressMiddleware(helmet())
vegaa.useExpressMiddleware(cors())
```

### Path-Specific Middleware

```js
// Apply middleware to specific paths
vegaa.useExpressMiddleware('/api', (req, res, next) => {
  req.apiVersion = 'v1'
  next()
})
```

### Custom Express Middleware

```js
// Simple logging middleware
vegaa.useExpressMiddleware((req, res, next) => {
  console.log(`${req.method} ${req.url}`)
  next()
})

// Async middleware
vegaa.useExpressMiddleware(async (req, res, next) => {
  await someAsyncOperation()
  next()
})
```

## Accessing Express Request Properties

Express middleware can set properties on `req`, which become available in Vegaa routes:

```js
vegaa.useExpressMiddleware((req, res, next) => {
  req.user = { id: 1, name: 'John' }
  next()
})

// Access in Vegaa route
route('/profile').get((user) => {
  return { user }  // user comes from req.user
})
```

## Error Handling

Express error middleware integrates with Vegaa's error handling:

```js
vegaa.useExpressMiddleware((err, req, res, next) => {
  console.error('Error:', err)
  res.status(500).json({ error: 'Internal Server Error' })
})
```

## Examples

### Using Helmet for Security

```js
import { vegaa, enableExpressCompat, route } from 'vegaa'
import helmet from 'helmet'

enableExpressCompat(vegaa)
vegaa.useExpressMiddleware(helmet())

route('/api').get(() => ({ message: 'Secure API' }))
```

### CORS Configuration

```js
import cors from 'cors'

vegaa.useExpressMiddleware(cors({
  origin: 'https://example.com'
}))
```

### Request Logging

```js
vegaa.useExpressMiddleware((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
  next()
})
```

## Best Practices

1. **Enable compatibility once** - Call `enableExpressCompat` at the start of your app
2. **Keep Vegaa routes clean** - Use Express middleware for cross-cutting concerns
3. **Use Vegaa middleware when possible** - It's more integrated with Vegaa's context system
4. **Document middleware** - Make it clear which middleware is Express-based

## Next Steps

- See [Express Middleware Example](/docs/examples/express-middleware)
- Learn about [Vegaa Middleware](/docs/core-concepts/middleware)

