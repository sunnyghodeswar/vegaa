import { bodyParserPlugin, bodyParser } from '../../../src/plugins/bodyParser';

describe('Body Parser Plugin', () => {
  let ctx: any;
  let req: any;

  function createMockRequest(contentType: string, body: string | Buffer) {
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
      destroy: jest.fn(),
    };

    // Trigger events asynchronously
    setImmediate(() => {
      dataHandlers.forEach(handler => handler(Buffer.isBuffer(body) ? body : Buffer.from(body)));
      endHandlers.forEach(handler => handler());
    });

    return mockReq;
  }

  beforeEach(() => {
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

  describe('bodyParser', () => {
    it('should parse JSON body', async () => {
      req = createMockRequest('application/json', '{"test":"value"}');
      ctx.req = req;
      const middleware = bodyParser();
      await middleware(ctx);
      expect(ctx.body).toEqual({ test: 'value' });
    });

    it('should skip GET requests', async () => {
      req = {
        method: 'GET',
        headers: {},
        on: jest.fn(),
      };
      ctx.req = req;
      const middleware = bodyParser();
      await middleware(ctx);
      expect(ctx.body).toBeUndefined();
    });

    it('should skip if body already exists', async () => {
      req = createMockRequest('application/json', '{"test":"value"}');
      ctx.req = req;
      ctx.body = { existing: true };
      const middleware = bodyParser();
      await middleware(ctx);
      expect(ctx.body).toEqual({ existing: true });
    });

    it('should handle URL-encoded body', async () => {
      req = createMockRequest('application/x-www-form-urlencoded', 'key=value&foo=bar');
      ctx.req = req;
      const middleware = bodyParser();
      await middleware(ctx);
      expect(ctx.body).toEqual({ key: 'value', foo: 'bar' });
    });

    it('should handle text body', async () => {
      req = createMockRequest('text/plain', 'plain text');
      ctx.req = req;
      const middleware = bodyParser();
      await middleware(ctx);
      expect(ctx.body).toBe('plain text');
    });

    it('should enforce size limit', async () => {
      const dataHandlers: any[] = [];
      const endHandlers: any[] = [];
      
      req = {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        on: jest.fn((event: string, handler: any) => {
          if (event === 'data') {
            dataHandlers.push(handler);
          } else if (event === 'end') {
            endHandlers.push(handler);
          }
          return req;
        }),
        destroy: jest.fn(),
      };
      ctx.req = req;
      
      const middleware = bodyParser({ limit: 10 });
      const promise = middleware(ctx);
      
      // Send data exceeding limit
      setImmediate(() => {
        dataHandlers.forEach(handler => handler(Buffer.alloc(20)));
      });
      
      await promise.catch(() => {}); // Catch expected error
      expect(req.destroy).toHaveBeenCalled();
      expect(ctx.res.statusCode).toBe(413);
    });
  });

  describe('bodyParserPlugin', () => {
    it('should register as plugin', async () => {
      const app = require('../../../src/core/app').createApp();
      await app.plugin(bodyParserPlugin);
      expect((app as any).globalMiddlewares.length).toBeGreaterThan(0);
    });
  });
});

