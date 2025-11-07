/**
 * Quick GET Request Benchmark
 * ===========================
 * 
 * Simple, fast benchmark for iterative development.
 * Tests basic routing performance (no params, no body parsing).
 * 
 * Usage:
 *   node benchmarks/quick-get.js
 * 
 * This runs a quick 5-second benchmark to verify performance improvements.
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
fastifyApp.get('/test', async (req, res) => {
  return { message: 'Hello from Fastify!' }
})

// Benchmark configuration
const BENCH_CONFIG = {
  connections: 100,
  duration: 5, // 5 seconds for quick iteration
  url: 'http://localhost'
}

async function benchmark(name, port) {
  const result = await autocannon({
    ...BENCH_CONFIG,
    url: `${BENCH_CONFIG.url}:${port}/test`
  })
  
  return {
    name,
    requests: result.requests.total,
    reqPerSec: result.requests.average,
    latency: {
      avg: result.latency.average,
      p99: result.latency.p99
    }
  }
}

async function startServer(name, port) {
  if (name === 'Vegaa') {
    // Disable cluster mode for fair single-process comparison
    // Also ensure NODE_ENV is not 'production' to prevent auto-cluster
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    process.env.CLUSTER = 'false'
    await vegaa.startVegaaServer({ port, cluster: false })
    process.env.NODE_ENV = originalEnv
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
  console.log('\n🚀 Quick GET Request Benchmark (5 seconds)\n')
  console.log('='.repeat(60))
  
  const servers = {}
  const results = []
  
  try {
    // Start all servers
    servers.vegaa = await startServer('Vegaa', PORT_VEGAA)
    await new Promise(resolve => setTimeout(resolve, 500))
    
    servers.express = await startServer('Express', PORT_EXPRESS)
    await new Promise(resolve => setTimeout(resolve, 500))
    
    servers.fastify = await startServer('Fastify', PORT_FASTIFY)
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    console.log('\n📊 Running benchmarks...\n')
    
    // Benchmark each framework
    results.push(await benchmark('Vegaa', PORT_VEGAA))
    await new Promise(resolve => setTimeout(resolve, 500))
    
    results.push(await benchmark('Express', PORT_EXPRESS))
    await new Promise(resolve => setTimeout(resolve, 500))
    
    results.push(await benchmark('Fastify', PORT_FASTIFY))
    
    // Display results
    console.log('\n' + '='.repeat(60))
    console.log('📊 BENCHMARK RESULTS')
    console.log('='.repeat(60) + '\n')
    
    // Sort by requests per second
    results.sort((a, b) => b.reqPerSec - a.reqPerSec)
    
    const winner = results[0]
    const expressResult = results.find(r => r.name === 'Express')
    const vegaaResult = results.find(r => r.name === 'Vegaa')
    const fastifyResult = results.find(r => r.name === 'Fastify')
    
    for (const result of results) {
      const isWinner = result === winner
      const marker = isWinner ? '🏆' : '  '
      console.log(`${marker} ${result.name}:`)
      console.log(`   Requests/sec: ${result.reqPerSec.toFixed(2)}`)
      console.log(`   Avg Latency:  ${result.latency.avg.toFixed(2)}ms`)
      console.log(`   P99 Latency:  ${result.latency.p99.toFixed(2)}ms`)
      console.log(`   Total Reqs:   ${result.requests}`)
      console.log()
    }
    
    // Performance comparison
    if (vegaaResult && expressResult) {
      const vsExpress = ((vegaaResult.reqPerSec / expressResult.reqPerSec - 1) * 100).toFixed(1)
      console.log(`📈 Vegaa vs Express: ${vsExpress > 0 ? '+' : ''}${vsExpress}%`)
    }
    
    if (vegaaResult && fastifyResult) {
      const vsFastify = ((vegaaResult.reqPerSec / fastifyResult.reqPerSec - 1) * 100).toFixed(1)
      const status = vsFastify > 0 ? '✅ BEATING FASTIFY!' : '⚠️'
      console.log(`📈 Vegaa vs Fastify: ${vsFastify > 0 ? '+' : ''}${vsFastify}% ${status}`)
      
      if (vsFastify > 0) {
        console.log('\n🎉 SUCCESS! Vegaa is faster than Fastify!')
      } else {
        const gap = Math.abs(parseFloat(vsFastify))
        console.log(`\n📊 Gap to close: ${gap}%`)
      }
    }
    
    console.log('\n' + '='.repeat(60) + '\n')
    
  } catch (err) {
    console.error('❌ Benchmark failed:', err)
    process.exit(1)
  } finally {
    // Cleanup
    console.log('🧹 Cleaning up...')
    await Promise.all([
      stopServer(servers.vegaa),
      stopServer(servers.express),
      stopServer(servers.fastify)
    ])
    console.log('✅ Done\n')
  }
}

main().catch(console.error)

