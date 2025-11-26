# Cluster Mode

Vegaa supports cluster mode for utilizing all CPU cores, improving performance and reliability.

## Enabling Cluster Mode

```js
import { vegaa } from 'vegaa'

await vegaa.startVegaaServer({
  port: 4000,
  cluster: true  // Enable cluster mode
})
```

## How It Works

When cluster mode is enabled, Vegaa:

1. Creates a master process
2. Spawns worker processes (one per CPU core)
3. Distributes incoming requests across workers
4. Automatically restarts workers if they crash

## Benefits

- **Performance** - Utilize all CPU cores
- **Reliability** - Worker crashes don't bring down the entire server
- **Scalability** - Better handling of concurrent requests

## Example

```js
import { vegaa, route } from 'vegaa'

route('/ping').get(() => ({ message: 'pong' }))

await vegaa.startVegaaServer({
  port: 4000,
  cluster: true
})
```

## When to Use Cluster Mode

Use cluster mode when:

- You have multiple CPU cores
- You need maximum performance
- You're handling high traffic
- You want automatic worker restart

## Single Process Mode

For development or single-core systems:

```js
await vegaa.startVegaaServer({
  port: 4000,
  cluster: false  // Default
})
```

## Next Steps

- Learn about [Getting Started](/docs/getting-started)
- Explore [Performance Tips](/docs/api-reference)

