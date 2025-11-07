# Vegaa Performance Benchmarks

Comprehensive performance benchmarks comparing Vegaa against Express and Fastify.

## Prerequisites

```bash
cd benchmarks
npm install
```

## Running Benchmarks

### Run All Benchmarks
```bash
npm run bench
```

### Run Individual Benchmarks
```bash
npm run bench:simple      # Simple GET requests
npm run bench:params      # Route parameters
npm run bench:json        # JSON parsing
npm run bench:middleware  # Middleware chains
npm run bench:concurrent  # Concurrent requests
```

## Benchmark Scenarios

1. **Simple GET** - Basic routing performance
2. **Route Parameters** - Parameter extraction performance
3. **JSON Parsing** - Body parsing performance
4. **Middleware Chain** - Middleware execution performance
5. **Concurrent Requests** - High concurrency performance

## Results

Each benchmark outputs:
- Requests per second
- Average latency
- P99 latency
- Throughput
- Performance comparison (Vegaa vs Express vs Fastify)

## Notes

- Benchmarks use `autocannon` for load testing
- Each framework runs on separate ports (3001, 3002, 3003)
- Results may vary based on system resources
- For accurate results, run on a dedicated machine with minimal background processes

