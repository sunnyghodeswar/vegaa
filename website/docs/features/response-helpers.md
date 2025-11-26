# Response Helpers

Vegaa provides helper functions for common response types: HTML, text, and JSON.

## HTML Responses

Return HTML content:

```js
import { html } from 'vegaa'

route('/').get(() => {
  return html(`
    <!DOCTYPE html>
    <html>
      <head><title>Hello</title></head>
      <body><h1>Hello from Vegaa!</h1></body>
    </html>
  `)
})
```

## Text Responses

Return plain text:

```js
import { text } from 'vegaa'

route('/status').get(() => {
  return text('Server is running')
})
```

## JSON Responses

JSON is the default. Just return an object:

```js
route('/api').get(() => {
  return { message: 'Hello', status: 'ok' }
})
```

## Dynamic Responses

Use parameters in responses:

```js
route('/user/:id').get((id) => {
  return html(`
    <html>
      <body>
        <h1>User Profile</h1>
        <p>User ID: ${id}</p>
      </body>
    </html>
  `)
})
```

## Conditional Responses

Return different types based on conditions:

```js
route('/api/:type').get((type) => {
  if (type === 'html') {
    return html('<h1>HTML Response</h1>')
  }
  if (type === 'text') {
    return text('Text Response')
  }
  return { type, message: 'JSON Response' }
})
```

## Examples

### Simple HTML Page

```js
import { html } from 'vegaa'

route('/').get(() => {
  return html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Vegaa App</title>
        <style>
          body { font-family: Arial; padding: 40px; }
        </style>
      </head>
      <body>
        <h1>Welcome to Vegaa</h1>
        <p>Build fast APIs with zero boilerplate.</p>
      </body>
    </html>
  `)
})
```

### API Status Endpoint

```js
import { text } from 'vegaa'

route('/health').get(() => {
  return text('OK')
})
```

## Next Steps

- See [Response Helpers Example](/docs/examples/response-helpers)
- Learn about [Routes](/docs/core-concepts/routes)

