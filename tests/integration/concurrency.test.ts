import http from 'http';
import { createApp } from '../../src/core/app';

describe('Concurrency Integration Tests', () => {
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

  const startServer = async (maxConcurrency?: number): Promise<void> => {
    return new Promise((resolve) => {
      const httpServer = http.createServer(async (req, res) => {
        try {
          await (app as any).handleRequest(req, res);
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err?.message || 'Internal error' }));
        }
      });
      
      // Apply concurrency limit if provided
      if (maxConcurrency) {
        const Semaphore = require('../../src/utils/semaphore').Semaphore;
        const sem = new Semaphore(maxConcurrency);
        const originalListeners = httpServer.listeners('request');
        httpServer.removeAllListeners('request');
        httpServer.on('request', async (req, res) => {
          await sem.acquire();
          try {
            for (const listener of originalListeners) {
              await (listener as any)(req, res);
            }
          } finally {
            sem.release();
          }
        });
      }
      
      httpServer.listen(port, () => {
        server = httpServer;
        resolve();
      });
    });
  };

  describe('Concurrent Requests', () => {
    beforeEach(async () => {
      app = createApp();
      app.route('/concurrent').get(() => ({ success: true }));
      await startServer();
    });

    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, () => makeRequest('/concurrent'));
      const responses = await Promise.all(requests);
      
      expect(responses.length).toBe(10);
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);
      });
    });
  });
});

