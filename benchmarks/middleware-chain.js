/**
 * Benchmark: Middleware Chain
 * Tests middleware execution performance
 */

import autocannon from 'autocannon'
import express from 'express'
import Fastify from 'fastify'
import { vegaa, route } from '../dist/esm/index.js'

const PORT_VEGAA = 3001
const PORT_EXPRESS = 3002
const PORT_FASTIFY = 3003

// Vegaa setup - using public API
route('/chain').get(
  async () => ({ step1: true }),
  async (step1) => ({ step2: true, step1 }),
  async (step1, step2) => ({ step3: true, step1, step2 }),
  (step1, step2, step3) => {
    return { chain: [step1, step2, step3] }
  }
)

// Express setup
const expressApp = express()
expressApp.get('/chain', 
  (req, res, next) => {
    req.step1 = true
    next()
  },
  (req, res, next) => {
    req.step2 = true
    next()
  },
  (req, res, next) => {
    req.step3 = true
    next()
  },
  (req, res) => {
    res.json({ chain: [req.step1, req.step2, req.step3] })
  }
)

// Fastify setup
const fastifyApp = Fastify({ logger: false })
fastifyApp.get('/chain', {
  preHandler: [
    async (request, reply) => {
      request.step1 = true
    },
    async (request, reply) => {
      request.step2 = true
    },
    async (request, reply) => {
      request.step3 = true
    },
  ]
}, async (request, reply) => {
  return { chain: [request.step1, request.step2, request.step3] }
})

async function runBenchmark(name, port) {
  const server = await startServer(name, port)
  
  console.log(`\n📊 Benchmarking ${name} on port ${port}...`)
  
  const result = await autocannon({
    url: `http://localhost:${port}/chain`,
    connections: 100,
    duration: 10,
    pipelining: 1,
  })
  
  await stopServer(server)
  
  return {
    name,
    requests: {
      total: result.requests.total,
      average: result.requests.average,
    },
    latency: {
      average: result.latency.average,
      p99: result.latency.p99,
    },
  }
}

async function startServer(name, port) {
  if (name === 'Vegaa') {
    await vegaa.startVegaaServer({ port })
    console.log(`✅ ${name} started on port ${port}`)
    return vegaa
  } else if (name === 'Express') {
    return new Promise((resolve) => {
      const server = expressApp.listen(port, () => {
        console.log(`✅ ${name} started on port ${port}`)
        resolve(server)
      })
    })
  } else if (name === 'Fastify') {
    await fastifyApp.listen({ port })
    console.log(`✅ ${name} started on port ${port}`)
    return fastifyApp
  }
}

async function stopServer(server) {
  if (!server) return
  
  if (server.close && typeof server.close === 'function') {
    return new Promise((resolve) => {
      server.close(() => resolve())
    })
  } else if (server.server && typeof server.server.close === 'function') {
    return new Promise((resolve) => {
      server.server.close(() => resolve())
    })
  } else if (server.shutdown && typeof server.shutdown === 'function') {
    await server.shutdown()
  }
}

async function main() {
  console.log('🚀 Starting Middleware Chain Benchmark\n')
  console.log('='.repeat(60))
  
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  const results = []
  
  try {
    results.push(await runBenchmark('Vegaa', PORT_VEGAA))
    await new Promise(resolve => setTimeout(resolve, 500))
    
    results.push(await runBenchmark('Express', PORT_EXPRESS))
    await new Promise(resolve => setTimeout(resolve, 500))
    
    results.push(await runBenchmark('Fastify', PORT_FASTIFY))
  } catch (err) {
    console.error('Error during benchmark:', err)
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('📊 BENCHMARK RESULTS: Middleware Chain')
  console.log('='.repeat(60))
  
  results.forEach(result => {
    console.log(`\n${result.name}:`)
    console.log(`  Requests/sec: ${result.requests.average.toFixed(2)}`)
    console.log(`  Avg Latency: ${result.latency.average.toFixed(2)}ms`)
    console.log(`  P99 Latency: ${result.latency.p99.toFixed(2)}ms`)
  })
  
  const winner = results.reduce((a, b) => 
    a.requests.average > b.requests.average ? a : b
  )
  
  console.log(`\n🏆 Winner: ${winner.name} (${winner.requests.average.toFixed(2)} req/s)`)
  
  process.exit(0)
}

main().catch(console.error)

