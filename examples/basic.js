/**
 * Vegaa Basic Example (Pure JavaScript)
 * -------------------------------------
 * Demonstrates the simplest Vegaa usage
 */

const { vegaa, route } = require('../dist/cjs/index.js')

// Simple route
route('/ping').get(() => {
  return { message: 'pong' }
})

// Route with parameters
route('/users/:id').get((id) => {
  return { userId: id, name: `User ${id}` }
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

