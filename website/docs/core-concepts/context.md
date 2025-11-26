# Context

Vegaa's context system is what makes automatic parameter injection possible. It's the invisible layer that connects everything together.

## What is Context?

Context is an object that contains all available values for a request:

- Route parameters
- Query parameters
- Request body
- Middleware-provided values
- Headers
- And more...

## How Context Works

When a request comes in, Vegaa:

1. Extracts route parameters
2. Parses query string
3. Parses request body (if applicable)
4. Runs middleware in order
5. Builds a context object with all values
6. Matches handler parameters to context values
7. Calls your handler with the matched values

## Accessing Context Directly

You can access the full context object if needed:

```js
route('/example').get((ctx) => {
  // ctx contains all available values
  return {
    params: ctx.params,
    query: ctx.query,
    body: ctx.body,
    headers: ctx.headers
  }
})
```

## Context Values

Common context values:

- `params` - Route parameters object
- `query` - Query string parameters object
- `body` - Request body
- `headers` - Request headers
- Any middleware-provided values

## Middleware and Context

Middleware adds values to context:

```js
vegaa.middleware(() => {
  return { 
    user: { id: 1 },
    timestamp: Date.now()
  }
})

// These values are now in context
route('/profile').get((user, timestamp) => {
  return { user, timestamp }
})
```

## Parameter Matching

Vegaa matches handler parameters to context values by name:

```js
// Context has: { id: '123', user: {...}, body: {...} }

route('/users/:id').post((id, user, body) => {
  // id → context.params.id
  // user → context.user (from middleware)
  // body → context.body
})
```

## Advanced Context Usage

### Custom Context Values

Add custom values via middleware:

```js
vegaa.middleware((query) => {
  return {
    apiVersion: query.v || 'v1',
    requestId: generateId()
  }
})

route('/api').get((apiVersion, requestId) => {
  return { version: apiVersion, id: requestId }
})
```

### Context Transformation

Transform context values:

```js
vegaa.middleware((params) => {
  return {
    userId: parseInt(params.id),
    isAdmin: params.role === 'admin'
  }
})
```

## Best Practices

1. **Use descriptive parameter names** - Makes it clear what values you're using
2. **Group related values** - Use objects for complex data
3. **Keep middleware focused** - Each middleware should do one thing
4. **Use type hints** - TypeScript helps catch context mismatches

## Next Steps

- Explore [Examples](/docs/examples/basic)
- Learn about [Express Compatibility](/docs/features/express-compatibility)

