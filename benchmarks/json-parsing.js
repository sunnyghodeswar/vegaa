/**
 * Benchmark: JSON Parsing (POST with JSON body)
 * Tests body parsing performance
 */

import autocannon from 'autocannon'
import express from 'express'
import Fastify from 'fastify'
import { vegaa, route, bodyParserPlugin } from '../dist/esm/index.js'

const PORT_VEGAA = 3001
const PORT_EXPRESS = 3002
const PORT_FASTIFY = 3003

// Vegaa setup - using public API
// Plugin will be registered in main function

// Express setup
const expressApp = express()
expressApp.use(express.json())
expressApp.post('/api/data', (req, res) => {
  res.json({ received: req.body })
})

// Fastify setup
const fastifyApp = Fastify({ logger: false })
fastifyApp.post('/api/data', async (request, reply) => {
  return { received: request.body }
})

const testPayload = JSON.stringify({ name: 'Test', value: 123, data: Array(10).fill(0).map((_, i) => i) })

async function runBenchmark(name, port) {
  const server = await startServer(name, port)
  
  console.log(`\n📊 Benchmarking ${name} on port ${port}...`)
  
  const result = await autocannon({
    url: `http://localhost:${port}/api/data`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: testPayload,
    connections: 50,
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
  // Setup Vegaa plugin - using public API
  await vegaa.plugin(bodyParserPlugin)
  route('/api/data').post((body) => {
    return { received: body }
  })
  
  console.log('🚀 Starting JSON Parsing Benchmark\n')
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
  console.log('📊 BENCHMARK RESULTS: JSON Parsing')
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

