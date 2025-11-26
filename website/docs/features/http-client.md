# HTTP Client

Vegaa's HTTP client plugin lets you make external API calls easily.

## Setup

```js
import { vegaa, httpClientPlugin } from 'vegaa'

await vegaa.plugin(httpClientPlugin)
```

## Making Requests

The `makeRequest` function is automatically available in your routes:

```js
route('/posts').get(async (makeRequest) => {
  const posts = await makeRequest()
    .url('https://jsonplaceholder.typicode.com/posts')
    .get()
    .json()
  
  return { posts }
})
```

## HTTP Methods

### GET Request

```js
route('/posts/:id').get(async (id, makeRequest) => {
  const post = await makeRequest()
    .url(`https://api.example.com/posts/${id}`)
    .get()
    .json()
  
  return post
})
```

### POST Request

```js
route('/create-post').post(async (body, makeRequest) => {
  const newPost = await makeRequest()
    .url('https://api.example.com/posts')
    .post()
    .headers({ 'Content-Type': 'application/json' })
    .body(body)
    .json()
  
  return { created: true, post: newPost }
})
```

### PUT Request

```js
route('/update-post/:id').put(async (params, body, makeRequest) => {
  const updated = await makeRequest()
    .url(`https://api.example.com/posts/${params.id}`)
    .put()
    .headers({ 'Content-Type': 'application/json' })
    .body(body)
    .json()
  
  return updated
})
```

### DELETE Request

```js
route('/delete-post/:id').delete(async (id, makeRequest) => {
  await makeRequest()
    .url(`https://api.example.com/posts/${id}`)
    .delete()
  
  return { deleted: true }
})
```

## Setting Headers

```js
makeRequest()
  .url('https://api.example.com/data')
  .headers({
    'Authorization': 'Bearer token',
    'Content-Type': 'application/json'
  })
  .get()
  .json()
```

## Multiple Requests

Use `Promise.all` for parallel requests:

```js
route('/user-posts/:userId').get(async (userId, makeRequest) => {
  const [user, posts] = await Promise.all([
    makeRequest()
      .url(`https://api.example.com/users/${userId}`)
      .get()
      .json(),
    makeRequest()
      .url(`https://api.example.com/posts?userId=${userId}`)
      .get()
      .json()
  ])
  
  return { user, posts }
})
```

## Error Handling

```js
route('/external').get(async (makeRequest) => {
  try {
    const data = await makeRequest()
      .url('https://api.example.com/data')
      .get()
      .json()
    
    return { data }
  } catch (error) {
    return { error: 'Failed to fetch data' }
  }
})
```

## Configuration

Configure the HTTP client plugin:

```js
await vegaa.plugin(httpClientPlugin, {
  timeout: 5000  // 5 second timeout
})
```

## Next Steps

- See [HTTP Client Example](/docs/examples/http-client)
- Learn about [Plugins](/docs/features/plugins)

