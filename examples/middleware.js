/**
 * Vegaa Middleware Example (Pure JavaScript)
 * -------------------------------------------
 * Demonstrates global and route-specific middleware
 */

const { vegaa, route } = require('../dist/cjs/index.js')

// Global middleware - runs for all routes
vegaa.middleware(async () => {
  return { 
    user: { id: 1, name: 'John Doe' },
    timestamp: new Date().toISOString()
  }
})

// Chained middleware
vegaa.middleware([
  async () => ({ appName: 'Vegaa Demo' }),
  async (appName) => ({ greeting: `Welcome to ${appName}!` })
])

// Route with middleware injection
route('/profile').get((user, greeting) => {
  return {
    message: greeting,
    user,
    page: 'Profile'
  }
})

// Route-specific middleware
route('/admin/:id')
  .middleware((params) => {
    if (params.id !== '1') {
      throw new Error('Unauthorized')
    }
    return { access: 'granted', role: 'admin' }
  })
  .get((id, user, access, role) => {
    return {
      adminId: id,
      user,
      access,
      role
    }
  })

// Start server
async function main() {
  await vegaa.startVegaaServer({ port: 4000 })
  console.log('✅ Server running on http://localhost:4000')
}

main().catch(err => {
  console.error('💥 Server failed:', err)
  process.exit(1)
})

