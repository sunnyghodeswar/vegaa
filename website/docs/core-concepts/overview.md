# Core Concepts Overview

Vegaa is built around a few core concepts that make it powerful and easy to use.

## 1. Automatic Parameter Injection

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

## 2. Smart Parameter Grouping

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

## 3. Middleware System

Middleware creates reusable logic that flows through your app:

```js
// Global middleware
vegaa.middleware(() => {
  return { user: { id: 1, name: 'John' } }
})

// Use in routes
route('/profile').get((user) => {
  return { user }
})
```

## 4. Context Integration

Everything flows through Vegaa's context system. Middleware values, route parameters, and request data are all automatically available to your handlers.

## Learn More

- [Routes](/docs/core-concepts/routes)
- [Parameter Injection](/docs/core-concepts/parameter-injection)
- [Middleware](/docs/core-concepts/middleware)
- [Context](/docs/core-concepts/context)

