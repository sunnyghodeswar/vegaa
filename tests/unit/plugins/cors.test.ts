import { corsPlugin, corsMiddleware } from '../../../src/plugins/cors';
import { createApp } from '../../../src/core/app';

describe('CORS Plugin', () => {
  let app: ReturnType<typeof createApp>;
  let ctx: any;

  beforeEach(() => {
    app = createApp();
    ctx = {
      req: {
        method: 'GET',
        headers: {},
      },
      res: {
        setHeader: jest.fn(),
        statusCode: 200,
        end: jest.fn(),
      },
      _ended: false,
    };
  });

  describe('corsPlugin', () => {
    it('should register as plugin', async () => {
      await app.plugin(corsPlugin);
      expect((app as any).globalMiddlewares.length).toBeGreaterThan(0);
    });

    it('should accept options', async () => {
      const options = { origin: 'https://example.com' };
      await app.plugin(corsPlugin, options);
      expect((app as any).globalMiddlewares.length).toBeGreaterThan(0);
    });
  });

  describe('corsMiddleware', () => {
    it('should set CORS headers', async () => {
      const middleware = corsMiddleware();
      await middleware(ctx);
      expect(ctx.res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
      expect(ctx.res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', expect.any(String));
    });

    it('should handle OPTIONS request', async () => {
      ctx.req.method = 'OPTIONS';
      const middleware = corsMiddleware();
      await middleware(ctx);
      expect(ctx.res.statusCode).toBe(204);
      expect(ctx._ended).toBe(true);
    });

    it('should use custom origin', async () => {
      const middleware = corsMiddleware({ origin: 'https://example.com' });
      await middleware(ctx);
      expect(ctx.res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://example.com');
    });

    it('should use function origin', async () => {
      const middleware = corsMiddleware({
        origin: (origin) => origin === 'https://allowed.com' ? origin : undefined,
      });
      ctx.req.headers.origin = 'https://allowed.com';
      await middleware(ctx);
      expect(ctx.res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://allowed.com');
    });
  });
});

