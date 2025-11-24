import { Router } from '../../../src/router/adapter';

describe('Router Adapter', () => {
  let router: Router;

  beforeEach(() => {
    router = new Router();
  });

  describe('on()', () => {
    it('should register route', () => {
      const handler = jest.fn();
      router.on('GET', '/test', { handler } as any, handler);
      expect(router).toBeDefined();
    });
  });

  describe('find()', () => {
    it('should find registered route', () => {
      const handler = jest.fn();
      router.on('GET', '/test', { handler } as any, handler);
      const result = router.find('GET', '/test');
      expect(result).toBeDefined();
    });

    it('should return null for non-existent route', () => {
      const result = router.find('GET', '/not-found');
      expect(result).toBeNull();
    });

    it('should handle route parameters', () => {
      const handler = jest.fn();
      router.on('GET', '/users/:id', { handler } as any, handler);
      const result = router.find('GET', '/users/123');
      expect(result).toBeDefined();
      expect(result?.params).toEqual({ id: '123' });
    });
  });
});

