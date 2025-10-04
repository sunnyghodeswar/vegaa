import { createApp } from '../index'
import { corsPlugin } from '../plugins/cors'
import { jsonPlugin } from '../plugins/json'

// Example user type
type User = { id: number; name: string }

async function main() {
  // ----------------------------------------------------
  // 🚀 Create app instance
  // ----------------------------------------------------
  const app = createApp()

  // ----------------------------------------------------
  // 🔌 Built-in Plugins
  // ----------------------------------------------------
  await app.plugin(corsPlugin)
  await app.plugin(jsonPlugin)

  // ----------------------------------------------------
  // 🌍 Global Middleware
  // ----------------------------------------------------
  // 1️⃣ Global header injection
  app.middleware((res) => {
    res.setHeader('X-Powered-By', 'VegaJS')
  })

  // 2️⃣ Mock auth middleware (returns a user → auto-injected)
  app.middleware(() => ({
    user: { id: 1, name: 'Sunny Dev' } as User
  }))

  // ----------------------------------------------------
  // 🧩 Decorators (optional helpers)
  // ----------------------------------------------------
  app.decorate('greet', () => '👋 Hello from VegaJS!')

  // ----------------------------------------------------
  // ⚡ Routes
  // ----------------------------------------------------

  // 1️⃣ Health check
  app('/ping').get((res) => {
    res.json({ ok: true, framework: 'VegaJS' })
  })

  // 2️⃣ Movies endpoint with middleware + contextual args
  app('/movie')
    .middleware((user: User | undefined) => {
      console.log('Route-level middleware → user:', user?.name)
    })
    .get((user: User | undefined, res) => {
      res.json({
        msg: '🎬 List of movies',
        user,
        greet: (app as any).greet?.()
      })
    })
    .post((body: any, user: User | undefined, res) => {
      res.json({
        msg: '✅ Movie added successfully',
        body,
        addedBy: user
      })
    })

  // 3️⃣ Personalized route
  app('/me').get((user: User | undefined) => ({
    msg: `Hi ${user?.name ?? 'Guest'}`
  }))

  // 4️⃣ Cached route (demonstrates cacheTTL)
  app('/slow').get({ cacheTTL: 5000 }, (res) => {
    res.json({
      msg: '🕐 Cached response valid for 5s',
      time: new Date().toISOString()
    })
  })

  // ----------------------------------------------------
  // 🖥️ Start the Server
  // ----------------------------------------------------
  await app.startServer({ port: 4000, maxConcurrency: 200 })
}

// Global safety net
main().catch((err) => {
  console.error('💥 Fatal Error:', err)
  process.exit(1)
})