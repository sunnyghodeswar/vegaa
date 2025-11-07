/**
 * Run all benchmarks and generate comprehensive report
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const execAsync = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const benchmarks = [
  { name: 'Simple GET', file: 'simple-get.js' },
  { name: 'Route Parameters', file: 'route-params.js' },
  { name: 'JSON Parsing', file: 'json-parsing.js' },
  { name: 'Middleware Chain', file: 'middleware-chain.js' },
  { name: 'Concurrent Requests', file: 'concurrent-requests.js' },
]

async function runBenchmark(benchmark) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Running: ${benchmark.name}`)
  console.log('='.repeat(60))
  
  try {
    const { stdout, stderr } = await execAsync(`node ${benchmark.file}`, {
      cwd: __dirname,
    })
    
    if (stdout) console.log(stdout)
    if (stderr) console.error(stderr)
    
    return { success: true, name: benchmark.name }
  } catch (error) {
    console.error(`Error running ${benchmark.name}:`, error.message)
    return { success: false, name: benchmark.name, error: error.message }
  }
}

async function main() {
  console.log('🚀 Vegaa Performance Benchmark Suite')
  console.log('='.repeat(60))
  console.log('Comparing Vegaa vs Express vs Fastify')
  console.log('='.repeat(60))
  
  const results = []
  
  for (const benchmark of benchmarks) {
    const result = await runBenchmark(benchmark)
    results.push(result)
    
    // Wait between benchmarks
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('📊 BENCHMARK SUMMARY')
  console.log('='.repeat(60))
  
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  
  console.log(`\n✅ Successful: ${successful}/${benchmarks.length}`)
  if (failed > 0) {
    console.log(`❌ Failed: ${failed}/${benchmarks.length}`)
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.name}: ${r.error}`)
    })
  }
  
  console.log('\n🎯 All benchmarks completed!')
  console.log('\n💡 Tip: Review individual benchmark outputs above for detailed results.')
  
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(console.error)

