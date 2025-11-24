/**
 * Vegaa CRUD Example (Pure JavaScript)
 * -------------------------------------
 * Demonstrates full CRUD operations with smart parameter injection
 */

const { vegaa, route, corsPlugin, bodyParserPlugin } = require('../dist/cjs/index.js')

// Mock database
const db = {
  1: { id: 1, name: 'Alice', email: 'alice@example.com' },
  2: { id: 2, name: 'Bob', email: 'bob@example.com' }
}

async function main() {
  // Register plugins
  await vegaa.plugin(corsPlugin)
  await vegaa.plugin(bodyParserPlugin)
  
  console.log('✅ Plugins registered')

  // GET all users
  route('/users').get(() => {
    return {
      users: Object.values(db),
      total: Object.keys(db).length
    }
  })

  // GET single user (flattened params for GET)
  route('/users/:id').get((id) => {
    const user = db[Number(id)]
    if (!user) {
      return { error: 'User not found' }
    }
    return user
  })

  // POST create user (grouped params + body for POST)
  route('/users').post((body) => {
    if (!body?.name || !body?.email) {
      return { error: 'Missing name or email' }
    }

    const id = Math.max(0, ...Object.keys(db).map(Number)) + 1
    const newUser = { id, name: body.name, email: body.email }
    db[id] = newUser
    
    console.log(`✅ Created user: ${body.name}`)
    return { message: 'User created', user: newUser }
  })

  // PUT update user (grouped params + body)
  route('/users/:id').put((params, body) => {
    const id = Number(params.id)
    if (!db[id]) {
      return { error: 'User not found' }
    }

    db[id] = { ...db[id], ...body }
    console.log(`✅ Updated user: ${id}`)
    return { message: 'User updated', user: db[id] }
  })

  // DELETE user (flattened params for DELETE)
  route('/users/:id').delete((id) => {
    const user = db[Number(id)]
    if (!user) {
      return { error: 'User not found' }
    }

    delete db[Number(id)]
    console.log(`✅ Deleted user: ${id}`)
    return { message: `User ${id} deleted` }
  })

  // Start server
  await vegaa.startVegaaServer({ port: 4000 })
  console.log('✅ Server running on http://localhost:4000')
  console.log('\n📖 Try these endpoints:')
  console.log('  GET    http://localhost:4000/users')
  console.log('  GET    http://localhost:4000/users/1')
  console.log('  POST   http://localhost:4000/users (with JSON body)')
  console.log('  PUT    http://localhost:4000/users/1 (with JSON body)')
  console.log('  DELETE http://localhost:4000/users/1')
}

main().catch(err => {
  console.error('💥 Server failed:', err)
  process.exit(1)
})

