/**
 * Benchmark: JSON Parsing (POST with JSON body)
 * Tests body parsing performance
 */

import autocannon from 'autocannon'
import express from 'express'
import Fastify from 'fastify'
import cluster from 'cluster'
import { vegaa, route, bodyParserPlugin } from '../dist/esm/index.js'

const PORT_VEGAA = 3001
const PORT_VEGAA_CLUSTER = 3004
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
    await vegaa.startVegaaServer({ port, cluster: false })
    console.log(`✅ ${name} started on port ${port}`)
    return vegaa
  } else if (name === 'Vegaa Cluster') {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    process.env.CLUSTER = 'true'
    process.env.BENCHMARK_MODE = 'true'
    await vegaa.startVegaaServer({ port, cluster: true })
    process.env.NODE_ENV = originalEnv
    console.log(`✅ ${name} started on port ${port} (cluster mode)`)
    // Wait for workers to be ready (2.5s to ensure all workers are listening)
    await new Promise(resolve => setTimeout(resolve, 2500))
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
  
  // Handle cluster mode shutdown
  if (process.env.CLUSTER === 'true' && cluster.isPrimary) {
    for (const id in cluster.workers) {
      const worker = cluster.workers[id]
      if (worker) worker.kill('SIGTERM')
    }
    await new Promise(resolve => setTimeout(resolve, 500))
    delete process.env.CLUSTER
    delete process.env.VEGAA_PORT
    return
  }
  
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
  // Skip benchmark in worker processes (cluster mode)
  if (process.env.CLUSTER === 'true' && cluster.isWorker) {
    return
  }
  
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
    
    results.push(await runBenchmark('Vegaa Cluster', PORT_VEGAA_CLUSTER))
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    results.push(await runBenchmark('Express', PORT_EXPRESS))
    await new Promise(resolve => setTimeout(resolve, 500))
    
    results.push(await runBenchmark('Fastify', PORT_FASTIFY))
  } catch (err) {
    console.error('Error during benchmark:', err)
  }
  
  console.log('\n' + '='.repeat(80))
  console.log('📊 BENCHMARK RESULTS: JSON Parsing')
  console.log('='.repeat(80))
  
  console.log('\n' + 'Framework'.padEnd(20) + 'Requests/sec'.padEnd(18) + 'Avg Latency'.padEnd(15) + 'P99 Latency')
  console.log('-'.repeat(80))
  
  results.forEach(result => {
    const name = result.name.padEnd(20)
    const reqs = result.requests.average.toFixed(2).padEnd(18)
    const avgLat = `${result.latency.average.toFixed(2)}ms`.padEnd(15)
    const p99Lat = `${result.latency.p99.toFixed(2)}ms`
    console.log(`${name}${reqs}${avgLat}${p99Lat}`)
  })
  
  const winner = results.reduce((a, b) => 
    a.requests.average > b.requests.average ? a : b
  )
  
  console.log(`\n🏆 Winner: ${winner.name} (${winner.requests.average.toFixed(2)} req/s)`)
  
  const expressResult = results.find(r => r.name === 'Express')
  const vegaaResult = results.find(r => r.name === 'Vegaa')
  const vegaaClusterResult = results.find(r => r.name === 'Vegaa Cluster')
  const fastifyResult = results.find(r => r.name === 'Fastify')
  
  console.log('\n📈 Performance Comparison:')
  if (expressResult && vegaaResult) {
    const improvement = ((vegaaResult.requests.average / expressResult.requests.average - 1) * 100).toFixed(1)
    console.log(`   Vegaa vs Express: ${improvement > 0 ? '+' : ''}${improvement}%`)
  }
  if (expressResult && vegaaClusterResult) {
    const improvement = ((vegaaClusterResult.requests.average / expressResult.requests.average - 1) * 100).toFixed(1)
    console.log(`   Vegaa Cluster vs Express: ${improvement > 0 ? '+' : ''}${improvement}%`)
  }
  if (fastifyResult && vegaaClusterResult) {
    const improvement = ((vegaaClusterResult.requests.average / fastifyResult.requests.average - 1) * 100).toFixed(1)
    console.log(`   Vegaa Cluster vs Fastify: ${improvement > 0 ? '+' : ''}${improvement}%`)
  }
  if (vegaaResult && vegaaClusterResult) {
    const improvement = ((vegaaClusterResult.requests.average / vegaaResult.requests.average - 1) * 100).toFixed(1)
    console.log(`   Vegaa Cluster vs Vegaa: ${improvement > 0 ? '+' : ''}${improvement}%`)
  }
  
  process.exit(0)
}

main().catch(console.error)

