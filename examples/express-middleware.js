/**
 * Vegaa Express Middleware Compatibility Example (Pure JavaScript)
 * -----------------------------------------------------------------
 * Demonstrates using Express middleware with Vegaa's minimal API
 */

const { vegaa, route, enableExpressCompat, html } = require('../dist/cjs/index.js')

async function main() {
  // Enable Express compatibility (adds useExpressMiddleware method)
  enableExpressCompat(vegaa)
  console.log('✅ Express compatibility enabled')

  // Example 1: Simple Express middleware (logging)
  vegaa.useExpressMiddleware((req, res, next) => {
    console.log(`📝 [Express MW] ${req.method} ${req.url}`)
    req.requestTime = new Date().toISOString()
    next()
  })

  // Example 2: Express middleware with path prefix
  vegaa.useExpressMiddleware('/api', (req, res, next) => {
    req.apiVersion = 'v1'
    console.log(`🔌 [API Middleware] API Version: ${req.apiVersion}`)
    next()
  })

  // Example 3: Express middleware that modifies response
  vegaa.useExpressMiddleware((req, res, next) => {
    res.setHeader('X-Powered-By', 'Vegaa')
    next()
  })

  // Example 4: Async Express middleware
  vegaa.useExpressMiddleware(async (req, res, next) => {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 10))
    req.asyncData = { loaded: true, timestamp: Date.now() }
    next()
  })

  // Example 5: Using real Express middleware (if installed)
  // Uncomment these if you have the packages installed:
  // const helmet = require('helmet')
  // const cors = require('cors')
  // vegaa.useExpressMiddleware(helmet())
  // vegaa.useExpressMiddleware(cors())

  // Vegaa routes - Express middleware properties available via context
  route('/').get((requestTime, asyncData) => {
    return html(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Vegaa + Express Middleware</title>
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
            }
            .info {
              background: rgba(255, 255, 255, 0.2);
              padding: 15px;
              border-radius: 5px;
              margin: 10px 0;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>🌿 Vegaa + Express Middleware</h1>
            <p>This demonstrates using Express middleware with Vegaa!</p>
            
            <div class="info">
              <strong>Request Time:</strong> ${requestTime || 'N/A'}<br>
              <strong>Async Data:</strong> ${asyncData ? 'Loaded ✅' : 'Not loaded'}
            </div>

            <h2>✨ Features:</h2>
            <ul>
              <li>✅ Express middleware integration</li>
              <li>✅ Preserves Vegaa's minimal API</li>
              <li>✅ Context injection works</li>
              <li>✅ Path-prefixed middleware</li>
            </ul>

            <h2>📖 Try These Routes:</h2>
            <ul>
              <li><a href="/api/users" style="color: white;">/api/users</a></li>
              <li><a href="/api/posts" style="color: white;">/api/posts</a></li>
              <li><a href="/error" style="color: white;">/error</a> (Error handler demo)</li>
            </ul>
          </div>
        </body>
      </html>
    `)
  })

  // API routes - Express middleware properties available via context
  route('/api/users').get((apiVersion, requestTime, asyncData) => {
    return {
      apiVersion,
      users: [
        { id: 1, name: 'Alice', email: 'alice@example.com' },
        { id: 2, name: 'Bob', email: 'bob@example.com' }
      ],
      requestTime,
      asyncData
    }
  })

  route('/api/posts').get((apiVersion, requestTime) => {
    return {
      apiVersion,
      posts: [
        { id: 1, title: 'Post 1', author: 'Alice' },
        { id: 2, title: 'Post 2', author: 'Bob' }
      ],
      requestTime
    }
  })

  // Error route
  route('/error').get(() => {
    throw new Error('This is a test error')
  })

  // Express error handler (4-parameter middleware)
  vegaa.useExpressMiddleware((err, req, res, next) => {
    console.error(`❌ [Express Error Handler] ${err.message}`)
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      error: err.message,
      path: req.url,
      timestamp: new Date().toISOString()
    }))
  })

  // Start server
  await vegaa.startVegaaServer({ port: 4000 })
  console.log('\n✅ Server running on http://localhost:4000')
  console.log('\n📖 Usage:')
  console.log('  vegaa.useExpressMiddleware(helmet())')
  console.log('  vegaa.useExpressMiddleware(cors())')
  console.log('  vegaa.useExpressMiddleware("/api", rateLimit())')
}

main().catch(err => {
  console.error('💥 Server failed:', err)
  process.exit(1)
})

