/**
 * Vegaa Functional Response Example
 * ----------------------------------------
 * Demonstrates the new functional style response API:
 *  ✅ html() - Return HTML content
 *  ✅ text() - Return text content
 *  ✅ json() - Return JSON (default behavior)
 *  ✅ file() - Return file to serve
 *
 * This matches the framework's design language better than res.html() style.
 */

import { vegaa, route, staticPlugin } from '../index'
import { html, text } from '../index'

async function main() {
  console.log('🚀 Starting Vegaa Functional Response Example Server...')

  // Register static file plugin
  await vegaa.plugin(staticPlugin, {
    root: './public',
    prefix: '/assets'
  })

  console.log('[Plugins] ✅ Static plugin registered')

  // ---------------------------------------------------------------------------
  // 🎨 ROUTES - Using Functional Response API
  // ---------------------------------------------------------------------------

  // 1. HTML response using functional style
  route('/').get(() => {
    return html(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Vegaa Functional API</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 800px;
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
            h1 { margin-top: 0; }
            code {
              background: rgba(0, 0, 0, 0.3);
              padding: 2px 6px;
              border-radius: 3px;
              font-family: 'Monaco', 'Courier New', monospace;
            }
            a { color: #fff; text-decoration: underline; }
            .example {
              background: rgba(255, 255, 255, 0.2);
              padding: 15px;
              border-radius: 5px;
              margin: 10px 0;
              border-left: 3px solid white;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>🌿 Vegaa Functional Response API</h1>
            <p>Welcome to the new functional response style!</p>
            
            <h2>✨ Functional API Style</h2>
            <div class="example">
              <code>return html('&lt;h1&gt;Hello&lt;/h1&gt;')</code>
            </div>
            <div class="example">
              <code>return text('Plain text')</code>
            </div>
            <div class="example">
              <code>return json({ data: 'value' })</code>
            </div>

            <h2>📖 Try These Routes:</h2>
            <ul>
              <li><a href="/simple">Simple HTML</a></li>
              <li><a href="/dynamic/123">Dynamic HTML</a></li>
              <li><a href="/status">Text Response</a></li>
              <li><a href="/api/users">JSON Response</a></li>
              <li><a href="/mixed/123">Mixed Content</a></li>
            </ul>
          </div>
        </body>
      </html>
    `)
  })

  // 2. Simple HTML response
  route('/simple').get(() => {
    return html(`
      <!DOCTYPE html>
      <html>
        <head><title>Simple</title></head>
        <body>
          <h1>✨ Simple HTML</h1>
          <p>This is clean and simple!</p>
          <a href="/">← Back</a>
        </body>
      </html>
    `)
  })

  // 3. Dynamic HTML with params
  route('/dynamic/:id').get((id: string) => {
    return html(`
      <!DOCTYPE html>
      <html>
        <head><title>Dynamic ID: ${id}</title></head>
        <body style="font-family: Arial; padding: 20px;">
          <h1>📋 Dynamic Response</h1>
          <p>ID Parameter: <strong>${id}</strong></p>
          <a href="/">← Back</a>
        </body>
      </html>
    `)
  })

  // 4. Text response
  route('/status').get(() => {
    return text('Service is running OK ✅')
  })

  // 5. JSON response (default behavior - just return object)
  route('/api/users').get(() => {
    return {
      users: [
        { id: 1, name: 'Alice', email: 'alice@example.com' },
        { id: 2, name: 'Bob', email: 'bob@example.com' },
        { id: 3, name: 'Charlie', email: 'charlie@example.com' }
      ],
      timestamp: new Date().toISOString(),
      total: 3
    }
  })

  // 6. Mixed response based on condition
  route('/mixed/:id').get((id: string) => {
    if (id === '123') {
      return html(`
        <!DOCTYPE html>
        <html>
          <body style="padding: 40px; font-family: Arial;">
            <h1>🎉 Special ID!</h1>
            <p>You got the special ID: ${id}</p>
            <a href="/">← Back</a>
          </body>
        </html>
      `)
    }
    // Default: return JSON
    return { id, type: 'json', message: 'Regular ID response' }
  })

  // 7. API with text response
  route('/api/health').get(() => {
    return text('HEALTHY')
  })

  // 8. Chaining with params
  route('/user/:id/profile').get((id: string) => {
    return html(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>User Profile</title>
          <style>
            body { font-family: Arial; max-width: 600px; margin: 50px auto; }
            .profile { background: #f5f5f5; padding: 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="profile">
            <h1>👤 User Profile</h1>
            <p><strong>User ID:</strong> ${id}</p>
            <a href="/">← Back</a>
          </div>
        </body>
      </html>
    `)
  })

  console.log(`
📖 USAGE EXAMPLES:
------------------

1. HTML Response:
   route('/').get(() => {
     return html('<h1>Hello</h1>')
   })

2. Text Response:
   route('/status').get(() => {
     return text('OK')
   })

3. JSON Response (default):
   route('/api/data').get(() => {
     return { data: 'value' }
   })

4. With Params:
   route('/user/:id').get((id: string) => {
     return html(\`<h1>User: \${id}</h1>\`)
   })

5. Conditional:
   route('/page/:type').get((type) => {
     if (type === 'html') {
       return html('<h1>HTML</h1>')
     }
     return json({ type })
   })
`)

  // Start the server
  await vegaa.startVegaaServer()
}

main().catch((err) => {
  console.error('💥 Startup failed:', err)
  process.exit(1)
})

