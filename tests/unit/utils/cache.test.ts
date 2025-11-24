import { cacheGetOrSet, _cacheClear } from '../../../src/utils/cache';

describe('Cache', () => {
  beforeEach(() => {
    // Clear cache between tests
    _cacheClear();
  });

  it('should cache and return value', async () => {
    const fn = jest.fn().mockResolvedValue('cached');
    const result = await cacheGetOrSet('key', 1000, fn);
    expect(result).toBe('cached');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should return cached value on second call', async () => {
    const fn = jest.fn().mockResolvedValue('cached');
    await cacheGetOrSet('key', 1000, fn);
    const result = await cacheGetOrSet('key', 1000, fn);
    expect(result).toBe('cached');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should expire cache after TTL', async () => {
    const fn = jest.fn().mockResolvedValue('cached');
    await cacheGetOrSet('key', 1000, fn);
    
    // Wait for TTL to expire
    await new Promise(resolve => setTimeout(resolve, 1001));
    
    const result = await cacheGetOrSet('key', 1000, fn);
    expect(result).toBe('cached');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should handle different keys independently', async () => {
    const fn1 = jest.fn().mockResolvedValue('value1');
    const fn2 = jest.fn().mockResolvedValue('value2');
    
    const result1 = await cacheGetOrSet('key1', 1000, fn1);
    const result2 = await cacheGetOrSet('key2', 1000, fn2);
    
    expect(result1).toBe('value1');
    expect(result2).toBe('value2');
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it('should handle async functions', async () => {
    const fn = jest.fn().mockImplementation(() => 
      Promise.resolve('async value')
    );
    const result = await cacheGetOrSet('key', 1000, fn);
    expect(result).toBe('async value');
  });

  it('should handle errors in function', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('Test error'));
    await expect(cacheGetOrSet('key', 1000, fn)).rejects.toThrow('Test error');
  });
});

