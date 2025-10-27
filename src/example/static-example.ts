/**
 * Vegaa Static File & HTML Response Example
 * ----------------------------------------
 * Demonstrates:
 *  ✅ Serving static files (HTML, CSS, JS, images)
 *  ✅ HTML response helpers
 *  ✅ Text response helpers
 *  ✅ Mixed JSON, HTML, and text responses
 */

import { vegaa, route, staticPlugin } from '../index'

async function main() {
  console.log('🚀 Starting Vegaa Static File Example Server...')

  // Register static file plugin
  // This will serve files from './public' directory
  await vegaa.plugin(staticPlugin, {
    root: './public',
    prefix: '/assets', // Serve static files at /assets/*
    indexFiles: ['index.html'], // Default index files
    cacheControl: 'public, max-age=3600'
  })

  console.log('[Plugins] ✅ Static plugin registered')

  // ---------------------------------------------------------------------------
  // 🎨 ROUTES - Demonstrating HTML, Text, and Static File Responses
  // ---------------------------------------------------------------------------

  // 1. Simple HTML response using .html() helper
  route('/').get((res: any) => {
    res.html(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Vegaa Framework</title>
          <style>
            body { font-family: Arial; max-width: 800px; margin: 50px auto; padding: 20px; }
            .section { background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px; }
            h1 { color: #2c3e50; }
            code { background: #e8e8e8; padding: 2px 6px; border-radius: 3px; }
          </style>
        </head>
        <body>
          <h1>🌿 Welcome to Vegaa Framework</h1>
          <div class="section">
            <h2>Features Demonstrated:</h2>
            <ul>
              <li>✅ HTML Response Helper</li>
              <li>✅ Static File Serving</li>
              <li>✅ Text Response Helper</li>
              <li>✅ Mixed Response Types</li>
            </ul>
          </div>
          <div class="section">
            <h2>Try These Routes:</h2>
            <ul>
              <li><a href="/html">HTML Response</a></li>
              <li><a href="/text">Text Response</a></li>
              <li><a href="/json">JSON Response</a></li>
              <li><a href="/users/123">User Details</a></li>
              <li><a href="/assets/logo.png">Static Asset (PNG)</a></li>
            </ul>
          </div>
        </body>
      </html>
    `)
  })

  // 2. HTML response with dynamic content
  route('/html').get((res: any) => {
    res.html(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>HTML Response</title>
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 50px;
              text-align: center;
            }
            h1 { font-size: 3em; margin: 20px 0; }
            p { font-size: 1.2em; opacity: 0.9; }
          </style>
        </head>
        <body>
          <h1>✨ HTML Response</h1>
          <p>This is a dynamic HTML response from Vegaa!</p>
          <a href="/" style="color: white; text-decoration: underline;">← Back to Home</a>
        </body>
      </html>
    `)
  })

  // 3. Text response
  route('/text').get((res: any) => {
    res.text(`
=================================
Vegaa Text Response Example
=================================

This demonstrates the .text() helper method.

Features:
- Plain text responses
- Custom content types
- Simple and lightweight

Status: ✅ Active
    `)
  })

  // 4. JSON response (default behavior)
  route('/json').get(() => {
    return {
      type: 'JSON Response',
      message: 'This is the default JSON response',
      features: [
        'Type-safe',
        'Fast serialization',
        'Schema validation support'
      ],
      timestamp: new Date().toISOString()
    }
  })

  // 5. Using response helpers in route handlers
  route('/users/:id').get((id: string, res: any) => {
    res.html(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>User Profile</title>
          <style>
            body { 
              font-family: Arial;
              max-width: 600px;
              margin: 50px auto;
              padding: 20px;
              background: #f9f9f9;
            }
            .profile {
              background: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .user-id {
              font-size: 2em;
              color: #667eea;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="profile">
            <h1>👤 User Profile</h1>
            <div class="user-id">User ID: ${id}</div>
            <p>This is a user profile page with dynamic ID parameter.</p>
            <p><a href="/">← Back to Home</a></p>
          </div>
        </body>
      </html>
    `)
  })

  // 6. Plain text API endpoint
  route('/api/status').get((res: any) => {
    res.text('Service is running OK ✅')
  })

  // 7. Send raw HTML with custom headers
  route('/raw-html').get((res: any) => {
    res.status(200)
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('X-Custom-Header', 'Vegaa-Rocks')
    res.end(`
      <h1>Raw HTML Response</h1>
      <p>This response was sent using native Node.js methods.</p>
    `)
    // Note: No return needed - res.end() already ended the response
  })

  // 8. Chained helper methods
  route('/chained').get((res: any) => {
    res
      .status(201)
      .type('text/html')
      .html('<h1>Chained Response</h1><p>Helper methods can be chained!</p>')
  })

  // ---------------------------------------------------------------------------
  // 📝 Usage Examples in Comments
  // ---------------------------------------------------------------------------

  console.log(`
📖 USAGE EXAMPLES:
------------------

1. Return HTML:
   route('/page').get((res) => {
     return res.html('<h1>Hello</h1>')
   })

2. Return Text:
   route('/plain').get((res) => {
     return res.text('Plain text content')
   })

3. Serve Static Files:
   await vegaa.plugin(staticPlugin, {
     root: './public',
     prefix: '/static',
     cacheControl: 'public, max-age=3600'
   })

4. Default JSON Response (still works):
   route('/api/users').get(() => {
     return { users: [...] }
   })

5. Mixed Response Types:
   route('/api/:id').get((id, res) => {
     if (id === 'html') {
       return res.html('<h1>HTML</h1>')
     }
     return { json: 'response' }
   })
`)

  // Start the server
  await vegaa.startVegaaServer()
}

main().catch((err) => {
  console.error('💥 Startup failed:', err)
  process.exit(1)
})

