/**
 * Benchmark: Concurrent Requests
 * Tests performance under high concurrency
 */

import autocannon from 'autocannon'
import express from 'express'
import Fastify from 'fastify'
import cluster from 'cluster'
import { vegaa, route } from '../dist/esm/index.js'

const PORT_VEGAA = 3001
const PORT_VEGAA_CLUSTER = 3004
const PORT_EXPRESS = 3002
const PORT_FASTIFY = 3003

// Vegaa setup - using public API
route('/concurrent').get(() => ({ message: 'Hello' }))

// Express setup
const expressApp = express()
expressApp.get('/concurrent', (req, res) => {
  res.json({ message: 'Hello' })
})

// Fastify setup
const fastifyApp = Fastify({ logger: false })
fastifyApp.get('/concurrent', async (request, reply) => {
  return { message: 'Hello' }
})

async function runBenchmark(name, port, connections = 200) {
  const server = await startServer(name, port)
  
  console.log(`\n📊 Benchmarking ${name} with ${connections} concurrent connections...`)
  
  const result = await autocannon({
    url: `http://localhost:${port}/concurrent`,
    connections,
    duration: 15,
    pipelining: 1,
  })
  
  await stopServer(server)
  
  return {
    name,
    connections,
    requests: {
      total: result.requests.total,
      average: result.requests.average,
    },
    latency: {
      average: result.latency.average,
      p99: result.latency.p99,
      min: result.latency.min,
      max: result.latency.max,
    },
    errors: result.errors || 0,
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
  
  console.log('🚀 Starting Concurrent Requests Benchmark\n')
  console.log('='.repeat(60))
  
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  const results = []
  
  try {
    results.push(await runBenchmark('Vegaa', PORT_VEGAA, 200))
    await new Promise(resolve => setTimeout(resolve, 500))
    
    results.push(await runBenchmark('Vegaa Cluster', PORT_VEGAA_CLUSTER, 200))
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    results.push(await runBenchmark('Express', PORT_EXPRESS, 200))
    await new Promise(resolve => setTimeout(resolve, 500))
    
    results.push(await runBenchmark('Fastify', PORT_FASTIFY, 200))
  } catch (err) {
    console.error('Error during benchmark:', err)
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('📊 BENCHMARK RESULTS: Concurrent Requests (200 connections)')
  console.log('='.repeat(60))
  
  results.forEach(result => {
    console.log(`\n${result.name}:`)
    console.log(`  Requests/sec: ${result.requests.average.toFixed(2)}`)
    console.log(`  Avg Latency: ${result.latency.average.toFixed(2)}ms`)
    console.log(`  P99 Latency: ${result.latency.p99.toFixed(2)}ms`)
    console.log(`  Min Latency: ${result.latency.min.toFixed(2)}ms`)
    console.log(`  Max Latency: ${result.latency.max.toFixed(2)}ms`)
    if (result.errors > 0) {
      console.log(`  ⚠️  Errors: ${result.errors}`)
    }
  })
  
  const winner = results.reduce((a, b) => 
    a.requests.average > b.requests.average ? a : b
  )
  
  console.log(`\n🏆 Winner: ${winner.name} (${winner.requests.average.toFixed(2)} req/s)`)
  
  // Calculate improvements
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

