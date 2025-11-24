import http from 'http';
import { createApp } from '../../src/core/app';

describe('Caching Integration Tests', () => {
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

  describe('Route Caching', () => {
    let callCount = 0;

    beforeEach(async () => {
      callCount = 0;
      app = createApp();
      app.route('/cached').get(
        { cacheTTL: 1000 },
        () => {
          callCount++;
          return { count: callCount, timestamp: Date.now() };
        }
      );
      await startServer();
    });

    it('should cache route responses', async () => {
      const response1 = await makeRequest('/cached');
      const response2 = await makeRequest('/cached');
      
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      // Both should return same cached value
      expect(response1.data.count).toBe(response2.data.count);
      expect(callCount).toBe(1); // Handler called only once
    });

    it('should expire cache after TTL', async () => {
      await makeRequest('/cached');
      await new Promise(resolve => setTimeout(resolve, 1100));
      await makeRequest('/cached');
      
      expect(callCount).toBe(2); // Handler called twice after expiration
    });
  });
});

