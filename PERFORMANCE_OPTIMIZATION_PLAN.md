# Performance Optimization Plan - Beat Fastify

## Current Performance Gap
- **Vegaa:** ~44k req/s
- **Fastify:** ~53k req/s
- **Gap:** ~20% slower

## Key Bottlenecks Identified

### 1. JSON Serialization (HIGH IMPACT)
**Problem:** Using `JSON.stringify()` everywhere instead of `fast-json-stringify`
- Error responses use `JSON.stringify()`
- 404 responses use `JSON.stringify()`
- Default responses only use `fast-json-stringify` when schema provided
- Response helpers (`res.json()`, `res.send()`) use `JSON.stringify()`

**Solution:** Create optimized serializers for common response types

### 2. Promise Overhead (MEDIUM IMPACT)
**Problem:** Unnecessary `Promise.resolve()` calls
- `await Promise.resolve(h(ctx))` in hooks
- `await Promise.resolve((entry.fn as any)(...args))` in middleware
- Creates microtask overhead

**Solution:** Remove unnecessary Promise wrapping

### 3. Object Iteration Overhead (MEDIUM IMPACT)
**Problem:** Using `Object.entries()` creates arrays
- Parameter injection: `for (const [k, v] of Object.entries(params))`
- Middleware result merging: `Object.entries(result).forEach(...)`
- Body flattening: `for (const [k, v] of Object.entries(ctx.body))`

**Solution:** Use `Object.keys()` or direct property access

### 4. Context Building (LOW-MEDIUM IMPACT)
**Problem:** URL parsing on every request
- `URLSearchParams` creation
- String slicing and iteration

**Solution:** Optimize URL parsing, cache parsed query strings

### 5. Response Helper Overhead (LOW IMPACT)
**Problem:** Function calls and checks on every response
- Multiple `writableEnded` checks
- Multiple `headersSent` checks

**Solution:** Inline checks, reduce function call overhead

## Optimization Priority

1. **JSON Serialization** (Expected: +15-20% improvement)
2. **Promise Overhead** (Expected: +5-8% improvement)
3. **Object Iteration** (Expected: +3-5% improvement)
4. **Context Building** (Expected: +2-3% improvement)
5. **Response Helpers** (Expected: +1-2% improvement)

**Total Expected Improvement: 26-38%** → Should beat Fastify!

