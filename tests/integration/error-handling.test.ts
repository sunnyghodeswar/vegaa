import http from 'http';
import { createApp } from '../../src/core/app';

describe('Error Handling Integration Tests', () => {
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

  const makeRequest = (path: string): Promise<{ status: number; data: any }> => {
    return new Promise((resolve, reject) => {
      const req = http.request(
        { hostname: 'localhost', port, path, method: 'GET' },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode || 200, data: JSON.parse(data) });
            } catch {
              resolve({ status: res.statusCode || 200, data });
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

  describe('Handler Errors', () => {
    beforeEach(async () => {
      app = createApp();
      app.route('/error').get(() => {
        throw new Error('Handler error');
      });
      await startServer();
    });

    it('should handle handler errors', async () => {
      const response = await makeRequest('/error');
      expect(response.status).toBe(500);
      expect(response.data.error).toBe('Handler error');
    });
  });

  describe('Error Hooks', () => {
    beforeEach(async () => {
      app = createApp();
      app.route('/error').get(() => {
        throw new Error('Test error');
      });
      app.onError(async (ctx, err) => {
        ctx.res.statusCode = 500;
        ctx.res.end(JSON.stringify({ customError: err.message }));
      });
      await startServer();
    });

    it('should call error hooks', async () => {
      const response = await makeRequest('/error');
      expect(response.status).toBe(500);
      expect(response.data.customError).toBe('Test error');
    });
  });

  describe('Middleware Errors', () => {
    beforeEach(async () => {
      app = createApp();
      app.middleware(async () => {
        throw new Error('Middleware error');
      });
      app.route('/test').get(() => ({ success: true }));
      await startServer();
    });

    it('should handle middleware errors', async () => {
      const response = await makeRequest('/test');
      expect(response.status).toBe(500);
      expect(response.data.error).toBe('Middleware error');
    });
  });

  describe('404 Errors', () => {
    beforeEach(async () => {
      app = createApp();
      app.route('/exists').get(() => ({ found: true }));
      await startServer();
    });

    it('should return 404 for non-existent routes', async () => {
      const response = await makeRequest('/not-found');
      expect(response.status).toBe(404);
      expect(response.data.error).toContain('not found');
    });
  });
});

