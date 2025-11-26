# Getting Started

🚀 **Quick Start**

Welcome to Vegaa! This guide will help you get up and running in minutes.

## Installation

Install Vegaa using npm:

```bash
npm install vegaa
```

**Requirements:** Node.js 18 or higher

## Your First API

Create a new file `server.js`:

```js
import { vegaa, route } from 'vegaa'

// Define a simple route
route('/ping').get(() => ({ message: 'pong' }))

// Start the server
await vegaa.startVegaaServer()
```

Run it:

```bash
node server.js
```

Visit `http://localhost:4000/ping` and you'll see:

```json
{
  "message": "pong"
}
```

That's it! You just built your first API endpoint.

## What Makes Vegaa Different?

### Traditional Express Approach

```js
app.get('/user/:id', (req, res) => {
  const user = req.user           // Extract from req
  const id = req.params.id        // Extract from params
  res.json({ user, id })          // Manually send response
})
```

### Vegaa Approach

```js
route('/user/:id').get((user, id) => ({ user, id }))
```

**No manual extraction. No `req`/`res` juggling. Just clean, readable code.**

## Next Steps

- Learn about [Core Concepts](/docs/core-concepts/overview)
- Explore [Examples](/docs/examples/basic)
- Check out [Express Compatibility](/docs/features/express-compatibility)
- Read the [API Reference](/docs/api-reference)

