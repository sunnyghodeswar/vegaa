/**
 * Benchmark: Simple GET Request
 * Tests basic routing performance
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
  
  try {
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
  } catch (err) {
    await stopServer(server)
    throw err
  }
}

async function startServer(name, port) {
  if (name === 'Vegaa') {
    await vegaa.startVegaaServer({ port, cluster: false })
    console.log(`✅ ${name} started on port ${port}`)
    // Return the app instance which has the server property
    return vegaa
  } else if (name === 'Vegaa Cluster') {
    // Enable cluster mode for Vegaa Cluster benchmark
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    process.env.CLUSTER = 'true'
    process.env.BENCHMARK_MODE = 'true' // Disable auto-restart in benchmarks
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
  
  // Handle cluster mode shutdown - kill workers immediately
  if (process.env.CLUSTER === 'true' && cluster.isPrimary) {
    for (const id in cluster.workers) {
      const worker = cluster.workers[id]
      if (worker) {
        worker.kill('SIGTERM')
      }
    }
    // Wait a bit for workers to die
    await new Promise(resolve => setTimeout(resolve, 500))
    // Clear cluster env
    delete process.env.CLUSTER
    delete process.env.VEGAA_PORT
    return
  }
  
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
  // In cluster mode, workers should start servers and stay alive
  // Only master process runs benchmarks
  if (process.env.CLUSTER === 'true' && cluster.isWorker) {
    // Workers just need to start their server - this happens in startServer()
    // Don't return early - let the server stay alive
    // The benchmark will only run in the master process
    return
  }
  
  console.log('🚀 Starting Simple GET Request Benchmark\n')
  console.log('='.repeat(60))
  
  // Wait for all servers to start
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  const results = []
  
  try {
    results.push(await runBenchmark('Vegaa', PORT_VEGAA))
    await new Promise(resolve => setTimeout(resolve, 1000)) // Wait for port to be free
    
    results.push(await runBenchmark('Vegaa Cluster', PORT_VEGAA_CLUSTER))
    await new Promise(resolve => setTimeout(resolve, 2000)) // Extra time for cluster cleanup
    
    results.push(await runBenchmark('Express', PORT_EXPRESS))
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    results.push(await runBenchmark('Fastify', PORT_FASTIFY))
  } catch (err) {
    console.error('Error during benchmark:', err)
  }
  
  // Print results in table format
  console.log('\n' + '='.repeat(80))
  console.log('📊 BENCHMARK RESULTS: Simple GET Request')
  console.log('='.repeat(80))
  
  // Table header
  console.log('\n' + 'Framework'.padEnd(20) + 'Requests/sec'.padEnd(18) + 'Avg Latency'.padEnd(15) + 'P99 Latency'.padEnd(15) + 'Throughput')
  console.log('-'.repeat(80))
  
  results.forEach(result => {
    const name = result.name.padEnd(20)
    const reqs = result.requests.average.toFixed(2).padEnd(18)
    const avgLat = `${result.latency.average.toFixed(2)}ms`.padEnd(15)
    const p99Lat = `${result.latency.p99.toFixed(2)}ms`.padEnd(15)
    const throughput = `${(result.throughput.average / 1024).toFixed(2)} KB/s`
    console.log(`${name}${reqs}${avgLat}${p99Lat}${throughput}`)
  })
  
  // Find winner
  const winner = results.reduce((a, b) => 
    a.requests.average > b.requests.average ? a : b
  )
  
  console.log(`\n🏆 Winner: ${winner.name} (${winner.requests.average.toFixed(2)} req/s)`)
  
  // Calculate performance comparisons
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
  if (fastifyResult && vegaaResult) {
    const improvement = ((vegaaResult.requests.average / fastifyResult.requests.average - 1) * 100).toFixed(1)
    console.log(`   Vegaa vs Fastify: ${improvement > 0 ? '+' : ''}${improvement}%`)
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

