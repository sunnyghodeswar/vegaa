# Parameter Injection

Vegaa's automatic parameter injection is one of its most powerful features. It eliminates boilerplate by automatically providing values based on parameter names.

## How It Works

Vegaa analyzes your handler function's parameter names and automatically injects matching values from:

1. Route parameters (`:id`, `:userId`, etc.)
2. Query string parameters
3. Request body (for POST, PUT, PATCH)
4. Middleware-provided values

## Route Parameters

Route parameters are automatically available:

```js
// Single parameter
route('/users/:id').get((id) => {
  return { userId: id }
})

// Multiple parameters
route('/users/:userId/posts/:postId').get((userId, postId) => {
  return { userId, postId }
})
```

## Request Body

For POST, PUT, and PATCH requests, the body is available:

```js
route('/users').post((body) => {
  return { created: true, user: body }
})
```

## Smart Grouping

When you have both route parameters and a body, Vegaa groups them:

```js
route('/users/:id').put((params, body) => {
  return {
    userId: params.id,    // Route parameter
    updatedData: body     // Request body
  }
})
```

## Query Parameters

Query string parameters are available via the `query` parameter:

```js
route('/search').get((query) => {
  return {
    term: query.q,
    page: query.page || 1
  }
})
```

## Middleware Values

Values provided by middleware are automatically available:

```js
vegaa.middleware(() => {
  return { user: { id: 1, name: 'John' } }
})

route('/profile').get((user) => {
  return { user }  // user is automatically injected
})
```

## Parameter Name Matching

Vegaa matches parameters by name:

- `id` → Route parameter `:id` or query `?id=...`
- `body` → Request body
- `query` → Query string object
- `params` → Route parameters object
- Any middleware-provided value name

## Examples

```js
// Simple GET with route parameter
route('/users/:id').get((id) => ({ userId: id }))

// POST with body
route('/users').post((body) => ({ created: body }))

// PUT with both params and body
route('/users/:id').put((params, body) => ({
  userId: params.id,
  data: body
}))

// With middleware
vegaa.middleware(() => ({ timestamp: Date.now() }))
route('/time').get((timestamp) => ({ time: timestamp }))
```

## Next Steps

- Learn about [Middleware](/docs/core-concepts/middleware)
- Explore [Examples](/docs/examples/basic)

