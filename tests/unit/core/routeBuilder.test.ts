import { createApp } from '../../../src/core/app';
import { RouteBuilder } from '../../../src/core/routeBuilder';

describe('RouteBuilder', () => {
  let app: ReturnType<typeof createApp>;
  let builder: RouteBuilder;

  beforeEach(() => {
    app = createApp();
    builder = app.route('/test');
  });

  describe('middleware()', () => {
    it('should register route-specific middleware', () => {
      const middleware = jest.fn();
      builder.middleware(middleware);
      expect((builder as any).mws).toContain(middleware);
    });

    it('should support multiple middlewares', () => {
      const mw1 = jest.fn();
      const mw2 = jest.fn();
      builder.middleware(mw1, mw2);
      expect((builder as any).mws).toHaveLength(2);
    });

    it('should return builder for chaining', () => {
      const result = builder.middleware(jest.fn());
      expect(result).toBe(builder);
    });
  });

  describe('get()', () => {
    it('should register GET route', () => {
      const handler = jest.fn();
      builder.get(handler);
      // Route should be registered in app
      expect((app as any).routerMap.has('GET')).toBe(true);
    });

    it('should support configuration object', () => {
      const handler = jest.fn();
      const config = { cacheTTL: 1000 };
      builder.get(config, handler);
      expect((app as any).routerMap.has('GET')).toBe(true);
    });
  });

  describe('post()', () => {
    it('should register POST route', () => {
      const handler = jest.fn();
      builder.post(handler);
      expect((app as any).routerMap.has('POST')).toBe(true);
    });
  });

  describe('put()', () => {
    it('should register PUT route', () => {
      const handler = jest.fn();
      builder.put(handler);
      expect((app as any).routerMap.has('PUT')).toBe(true);
    });
  });

  describe('delete()', () => {
    it('should register DELETE route', () => {
      const handler = jest.fn();
      builder.delete(handler);
      expect((app as any).routerMap.has('DELETE')).toBe(true);
    });
  });

  describe('chaining', () => {
    it('should allow method chaining', () => {
      const getHandler = jest.fn();
      const postHandler = jest.fn();
      builder.get(getHandler).post(postHandler);
      expect((app as any).routerMap.has('GET')).toBe(true);
      expect((app as any).routerMap.has('POST')).toBe(true);
    });

    it('should allow middleware chaining', () => {
      const mw1 = jest.fn();
      const mw2 = jest.fn();
      const handler = jest.fn();
      builder.middleware(mw1).middleware(mw2).get(handler);
      expect((builder as any).mws).toHaveLength(2);
    });
  });
});

