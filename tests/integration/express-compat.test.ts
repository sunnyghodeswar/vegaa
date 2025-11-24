import http from 'http';
import { createApp } from '../../src/core/app';
import { enableExpressCompat } from '../../src/core/expressCompat';

describe('Express Compatibility Integration Tests', () => {
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

  const makeRequest = (path: string, headers: any = {}): Promise<{ status: number; data: any; headers: any }> => {
    return new Promise((resolve, reject) => {
      const req = http.request(
        { hostname: 'localhost', port, path, method: 'GET', headers },
        (res) => {
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
        }
      );
      req.on('error', reject);
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

  describe('useExpressMiddleware', () => {
    beforeEach(async () => {
      app = createApp();
      enableExpressCompat(app);
      (app as any).useExpressMiddleware((req: any, res: any, next: any) => {
        req.requestTime = Date.now();
        next();
      });
      app.route('/test').get((requestTime: number) => ({ requestTime }));
      await startServer();
    });

    it('should work with Express middleware', async () => {
      const response = await makeRequest('/test');
      expect(response.status).toBe(200);
      expect(response.data.requestTime).toBeDefined();
      expect(typeof response.data.requestTime).toBe('number');
    });
  });

  describe('Express Error Handlers', () => {
    beforeEach(async () => {
      app = createApp();
      enableExpressCompat(app);
      (app as any).useExpressMiddleware((err: any, req: any, res: any, next: any) => {
        res.statusCode = 500;
        res.end(JSON.stringify({ expressError: err.message }));
      });
      app.route('/error').get(() => {
        throw new Error('Test error');
      });
      await startServer();
    });

    it('should handle Express error middleware', async () => {
      const response = await makeRequest('/error');
      expect(response.status).toBe(500);
      expect(response.data.expressError).toBe('Test error');
    });
  });
});

