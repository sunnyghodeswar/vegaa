/**
 * Vegaa Example App — Full CRUD Demo 🧠
 * -------------------------------------
 * Demonstrates:
 *  ✅ Global + route middleware with context injection
 *  ✅ Smart param flattening (GET/DELETE)
 *  ✅ Grouped params + body for POST/PUT
 *  ✅ makeRequest() for egress calls
 */

import { vegaa, route, corsPlugin, jsonPlugin, bodyParserPlugin } from '../index'
import { httpClientPlugin } from '../plugins/httpClient'

// 🧱 Mock DB (in-memory for demo)
const db: Record<number, { id: number; name: string; email: string }> = {
  1: { id: 1, name: 'Sunny', email: 'sunny@example.com' },
  2: { id: 2, name: 'Jane', email: 'jane@example.com' }
}

async function main() {
  console.log('🚀 Starting Vegaa CRUD Example Server...')

  // 🔌 Plugins (Body parser, JSON helper, CORS, HTTP client)
  await vegaa.plugin(corsPlugin)
  await vegaa.plugin(jsonPlugin)
  await vegaa.plugin(bodyParserPlugin)
  await vegaa.plugin(httpClientPlugin, { timeout: 4000 })
  console.log('[Plugins] ✅ All plugins registered')

  // 🌍 Global Middleware — adds context automatically
  vegaa.middleware([
    async () => ({ user: { id: 99, name: 'Admin' } }),
    async (user: { name: any; }) => ({ appName: `Vegaa CRUD for ${user.name}` }),
    async (user, appName, pathname) => {
      console.log(`🧩 [Global MW] ${user.name} → ${pathname} (${appName})`)
    }
  ])

  // 🧠 Decorate app with metadata
  vegaa.decorate('version', '1.2.0')
  console.log(`[Vegaa] version ${(vegaa as any).version}`)

  // ---------------------------------------------------------------------------
  // 🧱 CRUD ROUTES
  // ---------------------------------------------------------------------------

  // GET all users
  route('/users').get(() => ({
    users: Object.values(db)
  }))

  // POST create user (uses grouped body)
  route('/users').post((body: { name: string; email: string }) => {
    if (!body?.name || !body?.email) return { error: 'Missing name or email' }

    const id = Math.max(0, ...Object.keys(db).map(Number)) + 1
    const newUser = { id, name: body.name, email: body.email }
    db[id] = newUser
    console.log(`📦 [POST /users] Created user ${body.name}`)
    return { message: 'User created', user: newUser }
  })

  // GET single user (flattened params)
  route('/users/:id').get((id: any) => {
    console.log(`📦 [GET /users/${id}] Fetching user`)
    const user = db[Number(id)]
    return user ? user : { error: 'User not found' }
  })

  // PUT update user (grouped params + body)
  route('/users/:id').put((params: { id: any; }, body: { id: number; name: string; email: string; }) => {
    const id = Number(params.id)
    if (!db[id]) return { error: 'User not found' }

    db[id] = { ...db[id], ...body }
    console.log(`📦 [PUT /users/${id}] Updated user`)
    return { message: 'User updated', user: db[id] }
  })

  // DELETE user (flattened param)
  route('/users/:id').delete((id: any) => {
    const user = db[Number(id)]
    if (!user) return { error: 'User not found' }

    delete db[Number(id)]
    console.log(`📦 [DELETE /users/${id}] User deleted`)
    return { message: `User ${id} deleted` }
  })

  // Info route (auto injected values from middleware)
  route('/info').get((user: any, appName: any, version: any) => ({
    user,
    appName,
    version,
    totalUsers: Object.keys(db).length
  }))

  // Example: egress call using makeRequest()
  route('/ping').get(async (makeRequest: () => { (): any; new(): any; url: { (arg0: string): { (): any; new(): any; post: { (): { (): any; new(): any; body: { (arg0: { title: string; body: string; userId: number; }): { (): any; new(): any; json: { (): any; new(): any; }; }; new(): any; }; }; new(): any; }; }; new(): any; }; }) => {
    const res = await makeRequest()
      .url('https://jsonplaceholder.typicode.com/posts')
      .post()
      .body({ title: 'foo', body: 'bar', userId: 1 })
      .json()

    return { status: 'pong', external: res }
  })

  route('/users/:id/posts/:postId').get((id: any, postId: any) => ({ id, postId }))

  // 🚀 Start the server
  await vegaa.startVegaaServer()
}

main().catch((err) => {
  console.error('💥 Startup failed:', err)
  process.exit(1)
})