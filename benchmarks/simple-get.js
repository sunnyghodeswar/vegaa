/**
 * Benchmark: Simple GET Request
 * Tests basic routing performance
 */

import autocannon from 'autocannon'
import express from 'express'
import Fastify from 'fastify'
import { vegaa, route } from '../dist/esm/index.js'

const PORT_VEGAA = 3001
const PORT_EXPRESS = 3002
const PORT_FASTIFY = 3003

// Vegaa setup - using public API
route('/test').get(() => ({ message: 'Hello from Vegaa!' }))

// Express setup
const expressApp = express()
expressApp.get('/test', (req, res) => {
  res.json({ message: 'Hello from Express!' })
})

// Fastify setup
const fastifyApp = Fastify({ logger: false })
fastifyApp.get('/test', async (request, reply) => {
  return { message: 'Hello from Fastify!' }
})

async function runBenchmark(name, port, path = '/test') {
  const server = await startServer(name, port)
  
  console.log(`\n📊 Benchmarking ${name} on port ${port}...`)
  
  const result = await autocannon({
    url: `http://localhost:${port}${path}`,
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
    throughput: {
      average: result.throughput.average,
    },
  }
}

async function startServer(name, port) {
  if (name === 'Vegaa') {
    await vegaa.startVegaaServer({ port })
    console.log(`✅ ${name} started on port ${port}`)
    // Return the app instance which has the server property
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
    // Express server
    return new Promise((resolve) => {
      server.close(() => resolve())
    })
  } else if (server.server && typeof server.server.close === 'function') {
    // Vegaa app with server property
    return new Promise((resolve) => {
      server.server.close(() => resolve())
    })
  } else if (server.shutdown && typeof server.shutdown === 'function') {
    // Vegaa app with shutdown method
    await server.shutdown()
  }
}

async function main() {
  console.log('🚀 Starting Simple GET Request Benchmark\n')
  console.log('='.repeat(60))
  
  // Wait for all servers to start
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
  
  // Print results
  console.log('\n' + '='.repeat(60))
  console.log('📊 BENCHMARK RESULTS: Simple GET Request')
  console.log('='.repeat(60))
  
  results.forEach(result => {
    console.log(`\n${result.name}:`)
    console.log(`  Requests/sec: ${result.requests.average.toFixed(2)}`)
    console.log(`  Avg Latency: ${result.latency.average.toFixed(2)}ms`)
    console.log(`  P99 Latency: ${result.latency.p99.toFixed(2)}ms`)
    console.log(`  Throughput: ${(result.throughput.average / 1024).toFixed(2)} KB/s`)
  })
  
  // Find winner
  const winner = results.reduce((a, b) => 
    a.requests.average > b.requests.average ? a : b
  )
  
  console.log(`\n🏆 Winner: ${winner.name} (${winner.requests.average.toFixed(2)} req/s)`)
  
  // Calculate performance vs Express
  const expressResult = results.find(r => r.name === 'Express')
  const vegaaResult = results.find(r => r.name === 'Vegaa')
  const fastifyResult = results.find(r => r.name === 'Fastify')
  
  if (expressResult && vegaaResult) {
    const improvement = ((vegaaResult.requests.average / expressResult.requests.average - 1) * 100).toFixed(1)
    console.log(`\n📈 Vegaa vs Express: ${improvement > 0 ? '+' : ''}${improvement}%`)
  }
  
  if (fastifyResult && vegaaResult) {
    const improvement = ((vegaaResult.requests.average / fastifyResult.requests.average - 1) * 100).toFixed(1)
    console.log(`📈 Vegaa vs Fastify: ${improvement > 0 ? '+' : ''}${improvement}%`)
  }
  
  process.exit(0)
}

main().catch(console.error)

