# Plugins

Plugins extend Vegaa's functionality with reusable features like CORS, JSON parsing, and static file serving.

## Using Plugins

```js
import { vegaa, corsPlugin, bodyParserPlugin } from 'vegaa'

// Register plugins
await vegaa.plugin(corsPlugin)
await vegaa.plugin(bodyParserPlugin)
```

## Built-in Plugins

### CORS Plugin

Enable CORS support:

```js
import { corsPlugin } from 'vegaa'

await vegaa.plugin(corsPlugin)
```

### Body Parser Plugin

Parse request bodies automatically:

```js
import { bodyParserPlugin } from 'vegaa'

await vegaa.plugin(bodyParserPlugin)

// Now body is automatically parsed
route('/users').post((body) => {
  return { created: true, user: body }
})
```

### JSON Plugin

JSON response formatting:

```js
import { jsonPlugin } from 'vegaa'

await vegaa.plugin(jsonPlugin)
```

### Static File Plugin

Serve static files:

```js
import { staticPlugin } from 'vegaa'

await vegaa.plugin(staticPlugin, {
  root: './public',
  prefix: '/assets'
})
```

### HTTP Client Plugin

Make external HTTP requests:

```js
import { httpClientPlugin } from 'vegaa'

await vegaa.plugin(httpClientPlugin)

route('/posts').get(async (makeRequest) => {
  const posts = await makeRequest()
    .url('https://api.example.com/posts')
    .get()
    .json()
  
  return { posts }
})
```

## Plugin Configuration

Many plugins accept configuration options:

```js
await vegaa.plugin(staticPlugin, {
  root: './public',
  prefix: '/assets',
  // ... other options
})
```

## Creating Custom Plugins

Plugins are async functions that receive the app instance:

```js
async function myPlugin(app, options) {
  // Add middleware
  app.middleware(() => {
    return { customValue: options.value }
  })
  
  // Or add routes
  app.route('/custom').get(() => ({ message: 'Custom plugin' }))
}

await vegaa.plugin(myPlugin, { value: 'test' })
```

## Plugin Order

Plugins are registered in order. Register foundational plugins first:

```js
// 1. CORS (should be early)
await vegaa.plugin(corsPlugin)

// 2. Body parser (needed for POST/PUT)
await vegaa.plugin(bodyParserPlugin)

// 3. Other plugins
await vegaa.plugin(jsonPlugin)
```

## Next Steps

- See [HTTP Client Example](/docs/examples/http-client)
- Explore [All Examples](/docs/examples/basic)

