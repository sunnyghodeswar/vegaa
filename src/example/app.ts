/**
 * Vegaa Example App — Full CRUD Demo 🧠
 * -------------------------------------
 * Demonstrates:
 *  ✅ Global middleware and contextual injection
 *  ✅ Full CRUD with in-memory DB
 *  ✅ Auto param + body injection
 *  ✅ Chainable routes
 *  ✅ Logging for every major event
 */

import { vegaa, route, corsPlugin, jsonPlugin, bodyParserPlugin } from '../index'
import type { Context } from '../core/types'

// 🧱 Mock DB (in-memory for demo)
const db: Record<number, { id: number; name: string; email: string }> = {
  1: { id: 1, name: 'Sunny', email: 'sunny@example.com' },
  2: { id: 2, name: 'Jane', email: 'jane@example.com' }
}

async function main() {
  console.log('🚀 Starting Vegaa CRUD Example Server...')

  // 🔌 Plugins (Body parser, JSON helper, CORS)
  await vegaa.plugin(corsPlugin)
  await vegaa.plugin(jsonPlugin)
  await vegaa.plugin(bodyParserPlugin)
  console.log('[Plugins] ✅ All plugins registered')

  // 🌍 Global Middleware — inject user, log everything
  vegaa.middleware([
    async () => ({ user: { id: 99, name: 'Admin' } }),
    async (user: { name: any; }) => ({ appName: `Vegaa CRUD for ${user.name}` }),
    async (user, appName, pathname) => {
      console.log(`🧩 [Global MW] ${user.name} hitting ${pathname} under ${appName}`)
    }
  ])

  // 🧠 Decorate app with metadata
  vegaa.decorate('version', '1.1.0')
  console.log(`[Vegaa] version ${(vegaa as any).version}`)

  // 🧱 CRUD ROUTES -------------------------------------------------------------

  route('/users')
    // 🔍 GET all users
    .get(() => {
      console.log('📦 [GET /users] Returning all users')
      return { users: Object.values(db) }
    })

    // ➕ POST create user
    .post((body: { name: any; email: any; }) => {
      console.log('📦 [POST /users] Creating user', body)
      if (!body?.name || !body?.email)
        return { error: 'Missing name or email' }

      const id = Math.max(0, ...Object.keys(db).map(Number)) + 1
      const newUser = { id, name: body.name, email: body.email }
      db[id] = newUser
      return { message: 'User created', user: newUser }
    })

  // 🔍 GET single user
  route('/users/:id')
    .get((params: { id: any; }) => {
      console.log(`📦 [GET /users/${params.id}] Fetching user`)
      const user = db[Number(params.id)]
      return user ? user : { error: 'User not found' }
    })

    // ✏️ PUT update user
    .put((params: { id: any; }, body: { id: number; name: string; email: string; }) => {
      console.log(`📦 [PUT /users/${params.id}] Updating user`, body)
      const id = Number(params.id)
      if (!db[id]) return { error: 'User not found' }
      db[id] = { ...db[id], ...body }
      return { message: 'User updated', user: db[id] }
    })

    // ❌ DELETE user
    .delete((params: { id: any; }) => {
      console.log(`📦 [DELETE /users/${params.id}] Removing user`)
      const id = Number(params.id)
      if (!db[id]) return { error: 'User not found' }
      delete db[id]
      return { message: `User ${id} deleted` }
    })

  // 🧠 Info route (just for verification)
  route('/info').get((user: any, appName: any, version: any) => ({
    user,
    appName,
    version,
    totalUsers: Object.keys(db).length
  }))

  // 🚀 Start server
  await vegaa.startVegaaServer({ port: 4000 })
  // console.log('🌈 Vegaa live → http://localhost:4000')
}

main().catch((err) => {
  console.error('💥 Startup failed:', err)
  process.exit(1)
})