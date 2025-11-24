/**
 * Test server helper
 * Creates HTTP servers for integration tests
 */

import http from 'http';
import { createApp } from '../../src/core/app';

export interface TestServer {
  app: ReturnType<typeof createApp>;
  server: http.Server;
  port: number;
  url: string;
  close: () => Promise<void>;
}

export async function createTestServer(
  setupRoutes: (app: ReturnType<typeof createApp>) => void | Promise<void>,
  port?: number
): Promise<TestServer> {
  const app = createApp();
  await setupRoutes(app);
  
  const testPort = port || (30000 + Math.floor(Math.random() * 1000));
  
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        await (app as any).handleRequest(req, res);
      } catch (err: any) {
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err?.message || 'Internal error' }));
        }
      }
    });

    server.listen(testPort, () => {
      resolve({
        app,
        server,
        port: testPort,
        url: `http://localhost:${testPort}`,
        close: () => {
          return new Promise<void>((resolve) => {
            server.close(() => resolve());
          });
        },
      });
    });

    server.on('error', reject);
  });
}

export async function makeRequest(
  port: number,
  method: string,
  path: string,
  options: { headers?: any; body?: any } = {}
): Promise<{ status: number; data: any; headers: any }> {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: 'localhost',
      port,
      path,
      method,
      headers: {
        ...options.headers,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = res.headers['content-type']?.includes('application/json') && data
            ? JSON.parse(data)
            : data;
          resolve({
            status: res.statusCode || 200,
            data: parsed,
            headers: res.headers,
          });
        } catch {
          resolve({
            status: res.statusCode || 200,
            data,
            headers: res.headers,
          });
        }
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

