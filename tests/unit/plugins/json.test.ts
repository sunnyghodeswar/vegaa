import { jsonPlugin, jsonMiddleware } from '../../../src/plugins/json';
import { createApp } from '../../../src/core/app';

describe('JSON Plugin', () => {
  let app: ReturnType<typeof createApp>;
  let ctx: any;
  let req: any;

  function createMockRequest(contentType: string, body: string) {
    const dataHandlers: any[] = [];
    const endHandlers: any[] = [];
    
    const mockReq = {
      method: 'POST',
      headers: { 'content-type': contentType },
      on: jest.fn((event: string, handler: any) => {
        if (event === 'data') {
          dataHandlers.push(handler);
        } else if (event === 'end') {
          endHandlers.push(handler);
        }
        return mockReq;
      }),
    };

    setImmediate(() => {
      if (body) {
        dataHandlers.forEach(handler => handler(Buffer.from(body)));
      }
      endHandlers.forEach(handler => handler());
    });

    return mockReq;
  }

  beforeEach(() => {
    app = createApp();
    ctx = {
      res: {
        statusCode: 200,
        end: jest.fn(),
        writableEnded: false,
      },
      body: undefined,
      _ended: false,
    };
  });

  describe('jsonPlugin', () => {
    it('should register as plugin', async () => {
      await app.plugin(jsonPlugin);
      expect((app as any).globalMiddlewares.length).toBeGreaterThan(0);
    });
  });

  describe('jsonMiddleware', () => {
    it('should parse JSON body', async () => {
      req = createMockRequest('application/json', '{"test":"value"}');
      ctx.req = req;
      await jsonMiddleware(ctx);
      expect(ctx.body).toEqual({ test: 'value' });
    });

    it('should skip GET requests', async () => {
      req = {
        method: 'GET',
        headers: {},
        on: jest.fn(),
      };
      ctx.req = req;
      await jsonMiddleware(ctx);
      expect(ctx.body).toBeUndefined();
    });

    it('should skip if body already exists', async () => {
      req = createMockRequest('application/json', '{"test":"value"}');
      ctx.req = req;
      ctx.body = { existing: true };
      await jsonMiddleware(ctx);
      expect(ctx.body).toEqual({ existing: true });
    });

    it('should skip non-JSON content types', async () => {
      req = createMockRequest('text/plain', 'plain text');
      ctx.req = req;
      await jsonMiddleware(ctx);
      expect(ctx.body).toBeUndefined();
    });

    it('should handle malformed JSON gracefully', async () => {
      req = createMockRequest('application/json', 'invalid json');
      ctx.req = req;
      await jsonMiddleware(ctx);
      expect(ctx.body).toBe('invalid json'); // Falls back to raw string
    });
  });
});

