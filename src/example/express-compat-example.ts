/**
 * Vegaa Express Compatibility Example
 * 
 * Demonstrates using Express middlewares and plugins with Vegaa.
 * Shows how Express middlewares work directly with vegaa.middleware()
 * 
 * To run:
 *   VEGAA_EXPRESS_COMPAT=1 npm run dev
 * 
 * Or enable programmatically:
 *   import { enableExpressCompat } from 'vegaa';
 *   enableExpressCompat(vegaa);
 */

import { vegaa, route, enableExpressCompat } from '../index'

// Enable Express compatibility (or set VEGAA_EXPRESS_COMPAT=1)
enableExpressCompat(vegaa)

async function main() {
  console.log('🚀 Starting Vegaa with Express Compatibility...')

  // Example 1: Using Express middlewares directly with vegaa.middleware()
  // This is the equivalent of Express's app.use(helmet()), app.use(cors())
  // Note: This requires 'express' and the middleware packages to be installed
  try {
    // @ts-ignore - Optional dependency
    const helmetModule = await import('helmet')
    // @ts-ignore - Optional dependency
    const corsModule = await import('cors')
    // @ts-ignore - Optional dependency
    const sessionModule = await import('express-session')
    
    const helmet = helmetModule.default || helmetModule
    const cors = corsModule.default || corsModule
    const session = sessionModule.default || sessionModule
    
    // Use Express middlewares directly with vegaa.middleware()
    // No need for .use() - just use .middleware() like native Vegaa middlewares
    vegaa.middleware(helmet())  // Security headers
    vegaa.middleware(cors())    // Cross-Origin Resource Sharing
    
    // Express plugins (like session) also work with middleware()
    vegaa.middleware(session({
      secret: "supersecret",
      resave: false,
      saveUninitialized: true
    }))
    
    console.log('✅ Express middlewares registered')
  } catch (err) {
    console.log('ℹ️  Express middlewares not installed (optional)')
    console.log('   Install with: npm install helmet cors express-session')
  }

  // Example 2: Express API methods
  vegaa.set('title', 'Vegaa Express Compat Demo')
  vegaa.locals.author = 'Vegaa Team'
  console.log('App title:', vegaa.get('title'))

  // Example 3: Mount Express app (if express is installed)
  try {
    // @ts-ignore - Optional dependency
    const expressModule = await import('express')
    const express = expressModule.default || expressModule
    const expressApp = express()
    
    expressApp.get('/users', (req: any, res: any) => {
      res.json({ users: [{ id: 1, name: 'Alice' }] })
    })
    
    // Mount Express app at /api using middleware()
    vegaa.middleware(expressApp)
    
    console.log('✅ Express app mounted')
  } catch (err) {
    console.log('ℹ️  Express not installed (optional)')
  }

  // Example 4: Vegaa routes work alongside Express compatibility
  route('/ping').get(() => ({
    message: 'pong',
    expressCompat: true
  }))

  route('/info').get(() => ({
    app: 'Vegaa',
    expressCompat: true,
    settings: vegaa.settings,
    locals: vegaa.locals
  }))

  // Start server
  await vegaa.startVegaaServer({ port: 4000 })
  console.log('✅ Server running with Express compatibility enabled')
}

main().catch(console.error)

