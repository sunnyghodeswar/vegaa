# Routes

Routes are the foundation of your Vegaa application. They define how your API responds to different HTTP requests.

## Basic Route Definition

```js
import { route } from 'vegaa'

// GET route
route('/ping').get(() => ({ message: 'pong' }))

// POST route
route('/users').post((body) => {
  return { created: true, user: body }
})

// PUT route
route('/users/:id').put((params, body) => {
  return { updated: params.id, data: body }
})

// DELETE route
route('/users/:id').delete((id) => {
  return { deleted: id }
})
```

## HTTP Methods

Vegaa supports all standard HTTP methods:

```js
route('/example')
  .get(handler)      // GET
  .post(handler)     // POST
  .put(handler)      // PUT
  .patch(handler)    // PATCH
  .delete(handler)   // DELETE
  .options(handler)  // OPTIONS
  .head(handler)     // HEAD
```

## Route Parameters

Extract route parameters directly in your handler:

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

## Query Parameters

Access query string parameters:

```js
route('/search').get((query) => {
  return { 
    searchTerm: query.q,
    page: query.page || 1
  }
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
    return { access: 'granted' }
  })
  .get((id, access) => {
    return { adminId: id, access }
  })
```

## Next Steps

- Learn about [Parameter Injection](/docs/core-concepts/parameter-injection)
- Explore [Middleware](/docs/core-concepts/middleware)

