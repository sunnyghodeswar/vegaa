import http from 'http';
import { vegaa, route, html, text } from '../../src/index';
import { corsPlugin, bodyParserPlugin } from '../../src/plugins';

describe('Public API Integration Tests', () => {
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

  const makeRequest = (method: string, path: string, body?: any): Promise<{ status: number; data: any; headers: any }> => {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port,
        path,
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode || 200,
              data: res.headers['content-type']?.includes('application/json') && data ? JSON.parse(data) : data,
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
          await (vegaa as any).handleRequest(req, res);
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err?.message || 'Internal error' }));
        }
      });
      server.listen(port, () => resolve());
    });
  };

  describe('Public API - vegaa and route', () => {
    beforeEach(async () => {
      // Clear previous routes by creating new app instance
      // Note: In real usage, vegaa is a singleton, but for testing we'll work with it
      route('/ping').get(() => ({ message: 'pong' }));
      route('/users/:id').get((id) => ({ userId: id }));
      await startServer();
    });

    it('should work with public API - route()', async () => {
      const response = await makeRequest('GET', '/ping');
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ message: 'pong' });
    });

    it('should handle route parameters with public API', async () => {
      const response = await makeRequest('GET', '/users/123');
      expect(response.status).toBe(200);
      expect(response.data.userId).toBe('123');
    });
  });

  describe('Public API - Response Helpers', () => {
    beforeEach(async () => {
      route('/html').get(() => html('<h1>Hello</h1>'));
      route('/text').get(() => text('Plain text'));
      route('/json').get(() => ({ type: 'json' }));
      await startServer();
    });

    it('should work with html() helper', async () => {
      const response = await makeRequest('GET', '/html');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.data).toBe('<h1>Hello</h1>');
    });

    it('should work with text() helper', async () => {
      const response = await makeRequest('GET', '/text');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.data).toBe('Plain text');
    });

    it('should work with default JSON', async () => {
      const response = await makeRequest('GET', '/json');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.data).toEqual({ type: 'json' });
    });
  });

  describe('Public API - Plugins', () => {
    beforeEach(async () => {
      await vegaa.plugin(corsPlugin);
      await vegaa.plugin(bodyParserPlugin);
      route('/api').post((body) => ({ received: body }));
      await startServer();
    });

    it('should work with plugins', async () => {
      const body = { test: 'value' };
      const response = await makeRequest('POST', '/api', body);
      expect(response.status).toBe(200);
      expect(response.data.received).toEqual(body);
      expect(response.headers['access-control-allow-origin']).toBe('*');
    });
  });
});

