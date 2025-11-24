/**
 * Vegaa Express Compatibility Example
 * ----------------------------------------
 * Demonstrates:
 *  ✅ Using Express middleware with Vegaa's minimal API
 *  ✅ Preserving Vegaa's DNA (minimalism + context integration)
 *  ✅ Simple syntax: vegaa.useExpressMiddleware(helmet())
 *  ✅ Mixed Vegaa middleware + Express middleware
 *  ✅ Express error handlers
 */

import { vegaa, route, enableExpressCompat, type VegaaApp } from '../index'
import { html } from '../index'

async function main() {
  console.log('🚀 Starting Vegaa Express Compatibility Example Server...')

  // Enable Express compatibility (adds useExpressMiddleware method)
  enableExpressCompat(vegaa)
  console.log('[Express Compat] ✅ Express middleware support enabled')

  // Type assertion after enabling Express compat
  const app = vegaa as VegaaApp & { useExpressMiddleware: NonNullable<VegaaApp['useExpressMiddleware']> }

  // ---------------------------------------------------------------------------
  // 🔌 Express Middleware Examples (Vegaa-native syntax)
  // ---------------------------------------------------------------------------

  // Example 1: Simple Express middleware (logging)
  // Note: This preserves Vegaa's minimal API - no need for app.use()
  app.useExpressMiddleware((req: any, res: any, next: any) => {
    console.log(`📝 [Express MW] ${req.method} ${req.url}`)
    req.requestTime = new Date().toISOString()
    next()
  })

  // Example 2: Express middleware with path prefix
  app.useExpressMiddleware('/api', (req: any, res: any, next: any) => {
    req.apiVersion = 'v1'
    console.log(`🔌 [API Middleware] API Version: ${req.apiVersion}`)
    next()
  })

  // Example 3: Express middleware that modifies response
  app.useExpressMiddleware((req: any, res: any, next: any) => {
    // Add custom header
    res.setHeader('X-Powered-By', 'Vegaa')
    next()
  })

  // Example 4: Async Express middleware
  app.useExpressMiddleware(async (req: any, res: any, next: any) => {
    // Simulate async operation (e.g., database lookup)
    await new Promise(resolve => setTimeout(resolve, 10))
    req.asyncData = { loaded: true, timestamp: Date.now() }
    next()
  })

  // Example 5: Using real Express middleware (if installed)
  // vegaa.useExpressMiddleware(helmet())
  // vegaa.useExpressMiddleware(cors())
  // vegaa.useExpressMiddleware('/api', rateLimit({ windowMs: 60000, max: 100 }))

  // ---------------------------------------------------------------------------
  // 🧱 Vegaa Routes (work seamlessly with Express middleware)
  // ---------------------------------------------------------------------------
  // Vegaa routes automatically receive properties from Express middleware
  // via context injection - no need to access req/res manually!

  // Home route - Express middleware properties are available via context
  route('/').get((requestTime: string, asyncData: any) => {
    return html(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Vegaa Express Compatibility</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 900px;
              margin: 50px auto;
              padding: 20px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .card {
              background: rgba(255, 255, 255, 0.1);
              padding: 30px;
              border-radius: 10px;
              backdrop-filter: blur(10px);
              margin: 20px 0;
            }
            h1 { margin-top: 0; }
            code {
              background: rgba(0, 0, 0, 0.3);
              padding: 2px 6px;
              border-radius: 3px;
              font-family: 'Monaco', 'Courier New', monospace;
            }
            .info { background: rgba(255, 255, 255, 0.2); padding: 15px; border-radius: 5px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>🌿 Vegaa Express Compatibility</h1>
            <p>This example demonstrates using Express middleware with Vegaa!</p>
            
            <div class="info">
              <strong>Request Time:</strong> ${requestTime || 'N/A'}<br>
              <strong>Async Data:</strong> ${asyncData ? 'Loaded ✅' : 'Not loaded'}
            </div>

            <h2>✨ Features Demonstrated:</h2>
            <ul>
              <li>✅ Express middleware integration (Vegaa-native syntax)</li>
              <li>✅ Preserves Vegaa's minimal API</li>
              <li>✅ Context injection works with Express middleware</li>
              <li>✅ Path-prefixed Express middleware</li>
              <li>✅ Async Express middleware</li>
              <li>✅ Mixed Vegaa middleware + Express middleware</li>
            </ul>

            <h2>📖 Try These Routes:</h2>
            <ul>
              <li><a href="/api/users" style="color: white;">/api/users</a> - API route with Express middleware</li>
              <li><a href="/api/posts" style="color: white;">/api/posts</a> - Another API route</li>
              <li><a href="/error" style="color: white;">/error</a> - Error handler demo</li>
              <li><a href="/info" style="color: white;">/info</a> - App info</li>
            </ul>
          </div>
        </body>
      </html>
    `)
  })

  // API routes - Express middleware properties available via context injection
  route('/api/users').get((apiVersion: string, requestTime: string, asyncData: any) => {
    return {
      apiVersion,
      users: [
        { id: 1, name: 'Alice', email: 'alice@example.com' },
        { id: 2, name: 'Bob', email: 'bob@example.com' },
        { id: 3, name: 'Charlie', email: 'charlie@example.com' }
      ],
      requestTime,
      asyncData
    }
  })

  route('/api/posts').get((apiVersion: string, requestTime: string) => {
    return {
      apiVersion,
      posts: [
        { id: 1, title: 'Post 1', author: 'Alice' },
        { id: 2, title: 'Post 2', author: 'Bob' }
      ],
      requestTime
    }
  })

  // Info route
  route('/info').get(() => {
    return {
      message: 'Express middleware compatibility is working!',
      features: [
        'Vegaa-native syntax: useExpressMiddleware()',
        'Preserves Vegaa minimalism',
        'Context injection works with Express middleware',
        'Express error handlers supported',
        'Path-prefixed middleware supported'
      ]
    }
  })

  // Error route - demonstrates error handling
  route('/error').get(() => {
    throw new Error('This is a test error to demonstrate error handling')
  })

  // ---------------------------------------------------------------------------
  // 🚨 Express Error Handler (4-parameter middleware)
  // ---------------------------------------------------------------------------

  // Express error handlers use the same Vegaa-native syntax
  app.useExpressMiddleware((err: any, req: any, res: any, next: any) => {
    console.error(`❌ [Express Error Handler] ${err.message}`)
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      error: err.message,
      path: req.url,
      timestamp: new Date().toISOString()
    }))
  })

  // You can also use Vegaa's native error handler
  vegaa.onError(async (ctx, err) => {
    console.error(`🚨 [Vegaa Error Hook] ${err.message} at ${ctx.pathname}`)
  })

  // ---------------------------------------------------------------------------
  // 📝 Usage Examples
  // ---------------------------------------------------------------------------

  console.log(`
📖 EXPRESS COMPATIBILITY USAGE (Vegaa-Native Syntax):
----------------------------------------------------

1. Enable Express Compatibility:
   import { vegaa, enableExpressCompat } from 'vegaa'
   enableExpressCompat(vegaa)

2. Use Express Middleware (Vegaa-native syntax):
   vegaa.useExpressMiddleware((req, res, next) => {
     console.log('Express middleware')
     next()
   })

3. Use Real Express Middleware:
   import helmet from 'helmet'
   import cors from 'cors'
   
   vegaa.useExpressMiddleware(helmet())
   vegaa.useExpressMiddleware(cors())

4. Path-Prefixed Middleware:
   vegaa.useExpressMiddleware('/api', (req, res, next) => {
     req.apiVersion = 'v1'
     next()
   })

5. Express Error Handlers:
   vegaa.useExpressMiddleware((err, req, res, next) => {
     res.status(500).json({ error: err.message })
   })

6. Mixed Vegaa Middleware + Express Middleware:
   // Vegaa middleware (preferred)
   vegaa.middleware(() => ({ user: { id: 1 } }))
   
   // Express middleware (when needed)
   vegaa.useExpressMiddleware(helmet())
   
   // Routes get both via context injection!
   route('/users').get((user) => {
     // user from Vegaa middleware, security from Express middleware
     return { user }
   })

✨ Key Benefits:
- Preserves Vegaa's minimal API
- Context injection works with Express middleware
- No need to change your code style
- Use Express middleware only when needed
`)

  // Start the server
  await vegaa.startVegaaServer({ port: 4000 })
  console.log('\n✅ Server running! Visit http://localhost:4000')
}

main().catch((err) => {
  console.error('💥 Startup failed:', err)
  process.exit(1)
})

