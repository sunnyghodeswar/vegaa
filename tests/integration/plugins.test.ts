import http from 'http';
import { createApp } from '../../src/core/app';
import { corsPlugin, bodyParserPlugin } from '../../src/plugins';

describe('Plugin Integration Tests', () => {
  let app: ReturnType<typeof createApp>;
  let server: http.Server;
  let port: number;

  beforeAll(() => {
    port = 30000 + Math.floor(Math.random() * 1000);
  });

  afterEach(() => {
    if (server) {
      server.close();
    }
  });

  const makeRequest = (method: string, path: string, headers: any = {}, body?: any): Promise<{ status: number; data: any; headers: any }> => {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port,
        path,
        method,
        headers: {
          ...headers,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode || 200,
              data: data ? JSON.parse(data) : null,
              headers: res.headers,
            });
          } catch {
            resolve({ status: res.statusCode || 200, data, headers: res.headers });
          }
        });
      });

      req.on('error', reject);
      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  };

  const startServer = async (): Promise<void> => {
    return new Promise((resolve) => {
      server = http.createServer(async (req, res) => {
        try {
          await (app as any).handleRequest(req, res);
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err?.message || 'Internal error' }));
        }
      });
      server.listen(port, () => resolve());
    });
  };

  describe('CORS Plugin', () => {
    beforeEach(async () => {
      app = createApp();
      await app.plugin(corsPlugin);
      app.route('/test').get(() => ({ message: 'test' }));
      await startServer();
    });

    it('should add CORS headers', async () => {
      const response = await makeRequest('GET', '/test', { origin: 'https://example.com' });
      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });

    it('should handle OPTIONS request', async () => {
      const response = await makeRequest('OPTIONS', '/test', { origin: 'https://example.com' });
      expect(response.status).toBe(204);
    });
  });

  describe('Body Parser Plugin', () => {
    beforeEach(async () => {
      app = createApp();
      await app.plugin(bodyParserPlugin);
      app.route('/users').post((body) => ({ received: body }));
      await startServer();
    });

    it('should parse JSON body', async () => {
      const body = { name: 'John', email: 'john@example.com' };
      const response = await makeRequest('POST', '/users', {}, body);
      expect(response.status).toBe(200);
      expect(response.data.received).toEqual(body);
    });
  });

  describe('Multiple Plugins', () => {
    beforeEach(async () => {
      app = createApp();
      await app.plugin(corsPlugin);
      await app.plugin(bodyParserPlugin);
      app.route('/api').post((body) => ({ data: body }));
      await startServer();
    });

    it('should work with multiple plugins', async () => {
      const body = { test: 'value' };
      const response = await makeRequest('POST', '/api', { origin: 'https://example.com' }, body);
      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.data.data).toEqual(body);
    });
  });
});

