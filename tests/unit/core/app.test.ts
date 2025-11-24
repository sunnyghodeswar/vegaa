import { createApp } from '../../../src/core/app';
import { RouteBuilder } from '../../../src/core/routeBuilder';
import type { Context } from '../../../src/core/types';

describe('App', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
  });

  describe('route()', () => {
    it('should create a RouteBuilder instance', () => {
      const builder = app.route('/test');
      expect(builder).toBeInstanceOf(RouteBuilder);
    });

    it('should allow chaining route methods', () => {
      const builder = app.route('/test');
      expect(builder.get).toBeDefined();
      expect(builder.post).toBeDefined();
      expect(builder.put).toBeDefined();
      expect(builder.delete).toBeDefined();
    });
  });

  describe('call()', () => {
    it('should be an alias for route()', () => {
      const routeBuilder = app.route('/test');
      const callBuilder = app.call('/test');
      expect(routeBuilder).toBeInstanceOf(RouteBuilder);
      expect(callBuilder).toBeInstanceOf(RouteBuilder);
    });
  });

  describe('middleware()', () => {
    it('should register global middleware', () => {
      const middleware = jest.fn();
      app.middleware(middleware);
      // Access private property via type assertion for testing
      expect((app as any).globalMiddlewares).toHaveLength(1);
    });

    it('should register multiple middlewares as array', () => {
      const mw1 = jest.fn();
      const mw2 = jest.fn();
      app.middleware([mw1, mw2]);
      expect((app as any).globalMiddlewares).toHaveLength(2);
    });

    it('should throw error for non-function middleware', () => {
      expect(() => {
        app.middleware('not a function' as any);
      }).toThrow(TypeError);
    });
  });

  describe('decorate()', () => {
    it('should add properties to app', () => {
      app.decorate('customProp', 'value');
      expect((app as any).customProp).toBe('value');
    });

    it('should throw error if property already exists', () => {
      app.decorate('test', 'value1');
      expect(() => {
        app.decorate('test', 'value2');
      }).toThrow();
    });

    it('should throw error for invalid key', () => {
      expect(() => {
        app.decorate('', 'value');
      }).toThrow(TypeError);
    });
  });

  describe('plugin()', () => {
    it('should register a valid plugin', async () => {
      const plugin = {
        name: 'test',
        version: '1.0.0',
        register: jest.fn(),
      };
      await app.plugin(plugin);
      expect(plugin.register).toHaveBeenCalledWith(app, undefined);
    });

    it('should pass options to plugin', async () => {
      const plugin = {
        name: 'test',
        version: '1.0.0',
        register: jest.fn(),
      };
      const options = { test: true };
      await app.plugin(plugin, options);
      expect(plugin.register).toHaveBeenCalledWith(app, options);
    });

    it('should throw error for invalid plugin', async () => {
      await expect(app.plugin({} as any)).rejects.toThrow(TypeError);
    });
  });

  describe('lifecycle hooks', () => {
    it('should register onRequest hook', () => {
      const hook = jest.fn();
      app.onRequest(hook);
      expect((app as any).hooks.onRequest).toHaveLength(1);
    });

    it('should register onResponse hook', () => {
      const hook = jest.fn();
      app.onResponse(hook);
      expect((app as any).hooks.onResponse).toHaveLength(1);
    });

    it('should register onError hook', () => {
      const hook = jest.fn();
      app.onError(hook);
      expect((app as any).hooks.onError).toHaveLength(1);
    });
  });
});

