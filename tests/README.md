# Vegaa Test Suite

Comprehensive test coverage for all Vegaa framework features.

## Test Structure

Each feature has its own dedicated test file:

- `semaphore.test.ts` - Concurrency control and semaphore tests
- `cache.test.ts` - Cache functionality and memory leak tests
- `makeRequest.test.ts` - HTTP client tests
- `bodyParser.test.ts` - Body parsing and error handling tests
- `context.test.ts` - Context building and memory leak tests
- `params.test.ts` - Parameter injection and security tests
- `static.test.ts` - Static file serving and security tests
- `app.test.ts` - Core application and routing tests
- `middleware.test.ts` - Middleware execution tests
- `expressCompat.test.ts` - Express compatibility tests
- `errorHandling.test.ts` - Error handling and recovery tests
- `timeout.test.ts` - Request timeout tests
- `gracefulShutdown.test.ts` - Graceful shutdown tests

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Coverage Goals

- **Minimum**: 80% code coverage
- **Target**: 90%+ code coverage
- **Critical paths**: 100% coverage

## Test Categories

### Unit Tests
- Test individual functions and classes in isolation
- Mock dependencies where necessary
- Fast execution (< 100ms per test)

### Integration Tests
- Test feature interactions
- Use real HTTP requests where appropriate
- May take longer but provide confidence

### Security Tests
- Test for vulnerabilities
- Test input validation
- Test edge cases that could lead to exploits

### Performance Tests
- Test memory leaks
- Test resource cleanup
- Test under load

## Writing Tests

1. Use descriptive test names
2. Follow AAA pattern (Arrange, Act, Assert)
3. Clean up resources after tests
4. Test both success and failure cases
5. Test edge cases and boundary conditions

