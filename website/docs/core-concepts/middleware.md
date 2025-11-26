# Middleware

Middleware is the heart of Vegaa — it creates reusable logic that flows through your app.

## Global Middleware

Apply middleware to all routes:

```js
import { vegaa } from 'vegaa'

// Single middleware function
vegaa.middleware(() => {
  return { 
    user: { id: 1, name: 'John Doe' },
    timestamp: new Date().toISOString()
  }
})

// Now available in all routes
route('/profile').get((user, timestamp) => {
  return { user, timestamp }
})
```

## Chained Middleware

Chain multiple middleware functions:

```js
vegaa.middleware([
  async () => ({ appName: 'Vegaa Demo' }),
  async (appName) => ({ greeting: `Welcome to ${appName}!` })
])

route('/welcome').get((greeting) => {
  return { message: greeting }
})
```

## Route-Specific Middleware

Apply middleware to specific routes:

```js
route('/admin/:id')
  .middleware((params) => {
    if (params.id !== '1') {
      throw new Error('Unauthorized')
    }
    return { access: 'granted', role: 'admin' }
  })
  .get((id, access, role) => {
    return { adminId: id, access, role }
  })
```

## Async Middleware

Middleware can be async:

```js
vegaa.middleware(async () => {
  const user = await fetchUserFromDB()
  return { user }
})

route('/profile').get((user) => {
  return { user }
})
```

## Middleware Dependencies

Middleware can depend on values from previous middleware:

```js
vegaa.middleware([
  () => ({ userId: 1 }),
  async (userId) => {
    const user = await fetchUser(userId)
    return { user }
  },
  (user) => ({ permissions: getUserPermissions(user) })
])

route('/dashboard').get((user, permissions) => {
  return { user, permissions }
})
```

## Error Handling

Throw errors in middleware to stop execution:

```js
route('/protected')
  .middleware((query) => {
    if (!query.token) {
      throw new Error('Unauthorized')
    }
    return { authenticated: true }
  })
  .get((authenticated) => {
    return { message: 'Protected content' }
  })
```

## Common Use Cases

### Authentication

```js
vegaa.middleware(async (headers) => {
  const token = headers.authorization?.replace('Bearer ', '')
  if (!token) throw new Error('Unauthorized')
  
  const user = await verifyToken(token)
  return { user }
})
```

### Logging

```js
vegaa.middleware(() => {
  const startTime = Date.now()
  return { startTime }
})

// Log after request (would need response middleware)
```

### Request Validation

```js
route('/users')
  .middleware((body) => {
    if (!body.email || !body.name) {
      throw new Error('Missing required fields')
    }
    return { validated: true }
  })
  .post((body, validated) => {
    return { created: true, user: body }
  })
```

## Next Steps

- Learn about [Context](/docs/core-concepts/context)
- Explore [Express Compatibility](/docs/features/express-compatibility)
- See [Middleware Examples](/docs/examples/middleware)

