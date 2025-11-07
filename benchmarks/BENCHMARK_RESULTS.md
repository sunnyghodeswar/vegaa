# Vegaa Performance Benchmarks

**Date:** Latest  
**Framework Versions:**
- Vegaa: 1.1.4
- Express: 4.18.2
- Fastify: 4.24.3

**Test Environment:**
- Tool: autocannon
- Connections: 100 (200 for concurrent test)
- Duration: 10-15 seconds per test
- System: macOS (Darwin 25.0.0)

---

## Executive Summary

Vegaa demonstrates **strong performance**, consistently outperforming Express by **13-21%** across all test scenarios, while remaining competitive with Fastify (within 14-20% difference).

### Key Findings

✅ **Vegaa vs Express:** +13.9% to +21% faster  
✅ **Vegaa vs Fastify:** -13.9% to -19.8% (competitive)  
✅ **Best Performance:** Route parameters and middleware chains  
✅ **Consistent:** Performance advantage maintained across all scenarios

---

## Detailed Results

### 1. Simple GET Request

**Test:** Basic routing with no parameters or body parsing

| Framework | Requests/sec | Avg Latency | P99 Latency | Throughput |
|-----------|--------------|-------------|-------------|------------|
| **Vegaa** | **42,352** | 2.15ms | 4.00ms | 7,735 KB/s |
| Express | 37,186 | 2.19ms | 5.00ms | 9,732 KB/s |
| Fastify | 52,804 | 1.16ms | 2.00ms | 10,519 KB/s |

**Performance:**
- ✅ Vegaa vs Express: **+13.9% faster**
- ⚠️ Vegaa vs Fastify: -19.8% slower

**Winner:** Fastify

---

### 2. Route Parameters

**Test:** Parameter extraction from URL (`/user/:id`)

| Framework | Requests/sec | Avg Latency | P99 Latency |
|-----------|--------------|-------------|-------------|
| **Vegaa** | **43,581** | 2.04ms | 3.00ms |
| Express | 36,225 | 2.18ms | 5.00ms |
| Fastify | 53,546 | 1.10ms | 2.00ms |

**Performance:**
- ✅ Vegaa vs Express: **+20.3% faster**
- ⚠️ Vegaa vs Fastify: -18.6% slower

**Winner:** Fastify

---

### 3. JSON Parsing

**Test:** POST request with JSON body parsing

| Framework | Requests/sec | Avg Latency | P99 Latency |
|-----------|--------------|-------------|-------------|
| **Vegaa** | **39,748** | 1.02ms | 1.00ms |
| Express | 32,841 | 1.04ms | 1.00ms |
| Fastify | 45,625 | 1.00ms | 1.00ms |

**Performance:**
- ✅ Vegaa vs Express: **+21.0% faster**
- ⚠️ Vegaa vs Fastify: -12.9% slower

**Winner:** Fastify

**Note:** Vegaa shows excellent performance in JSON parsing, with the smallest gap vs Fastify.

---

### 4. Middleware Chain

**Test:** 3 middleware functions chained together

| Framework | Requests/sec | Avg Latency | P99 Latency |
|-----------|--------------|-------------|-------------|
| **Vegaa** | **45,354** | 2.03ms | 3.00ms |
| Express | 39,117 | 2.05ms | 3.00ms |
| Fastify | 54,052 | 1.08ms | 2.00ms |

**Performance:**
- ✅ Vegaa vs Express: **+16.0% faster**
- ⚠️ Vegaa vs Fastify: -16.1% slower

**Winner:** Fastify

**Note:** Vegaa's middleware system performs very well, showing strong efficiency in context injection.

---

### 5. Concurrent Requests

**Test:** High concurrency (200 simultaneous connections)

| Framework | Requests/sec | Avg Latency | P99 Latency | Max Latency |
|-----------|--------------|-------------|-------------|-------------|
| **Vegaa** | **44,688** | 4.08ms | 6.00ms | 316ms |
| Express | 37,706 | 4.90ms | 7.00ms | 317ms |
| Fastify | 51,873 | 3.21ms | 5.00ms | 250ms |

**Performance:**
- ✅ Vegaa vs Express: **+18.5% faster**
- ⚠️ Vegaa vs Fastify: -13.9% slower

**Winner:** Fastify

**Note:** Vegaa handles high concurrency well, with better latency characteristics than Express.

---

## Performance Summary

### Average Performance Improvement

| Comparison | Improvement |
|------------|-------------|
| **Vegaa vs Express** | **+17.9%** |
| Vegaa vs Fastify | -16.3% |

### Performance by Category

| Category | Vegaa vs Express | Vegaa vs Fastify |
|----------|------------------|------------------|
| Simple Routing | +13.9% | -19.8% |
| Route Parameters | +20.3% | -18.6% |
| JSON Parsing | +21.0% | -12.9% |
| Middleware Chain | +16.0% | -16.1% |
| Concurrent Requests | +18.5% | -13.9% |

---

## Key Insights

### ✅ Strengths

1. **Consistently Faster Than Express**
   - 13-21% performance improvement across all scenarios
   - Best improvement in JSON parsing (+21%)

2. **Competitive with Fastify**
   - Within 13-20% of Fastify's performance
   - Excellent for a framework with more features (context injection, Express compat)

3. **Strong Middleware Performance**
   - Efficient context injection system
   - Low overhead for middleware chains

4. **Good Concurrency Handling**
   - Better than Express under high load
   - Stable latency characteristics

### ⚠️ Areas for Improvement

1. **Simple Routing**
   - Largest gap vs Fastify (-19.8%)
   - Could optimize basic route matching

2. **Route Parameters**
   - Parameter extraction could be optimized
   - Currently -18.6% vs Fastify

### 🎯 Performance Positioning

```
Fastify: ████████████████████ (100%)
Vegaa:   ████████████████     (84%)
Express: ████████████         (70%)
```

**Vegaa sits between Express and Fastify**, offering:
- ✅ Better performance than Express
- ✅ More features than Fastify (context injection, Express compat)
- ✅ Excellent developer experience

---

## Conclusion

Vegaa demonstrates **strong production-ready performance**:

1. ✅ **Significantly faster than Express** (13-21% improvement)
2. ✅ **Competitive with Fastify** (within 14-20%)
3. ✅ **Consistent performance** across all scenarios
4. ✅ **Excellent for real-world use** with feature-rich API

### Recommendation

Vegaa is **production-ready** with performance characteristics that:
- Outperform Express significantly
- Compete well with Fastify while offering more features
- Provide excellent developer experience

The performance gap vs Fastify is acceptable given Vegaa's additional features (smart parameter injection, Express compatibility, built-in plugins).

---

## Running the Benchmarks

```bash
cd benchmarks
npm install
npm run bench              # Run all benchmarks
npm run bench:simple       # Simple GET only
npm run bench:params       # Route parameters only
npm run bench:json         # JSON parsing only
npm run bench:middleware   # Middleware chain only
npm run bench:concurrent   # Concurrent requests only
```

---

**Benchmark Suite Version:** 1.0.0  
**Last Updated:** Latest

