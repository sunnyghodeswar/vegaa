import http from 'http';
import { createApp } from '../../src/core/app';

describe('Route Integration Tests', () => {
  let app: ReturnType<typeof createApp>;
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    app = createApp();
    port = 30000 + Math.floor(Math.random() * 1000);
  });

  afterEach(() => {
    if (server) {
      server.close();
    }
  });

  const makeRequest = (method: string, path: string, body?: any): Promise<{ status: number; data: any }> => {
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
              data: data ? JSON.parse(data) : null,
            });
          } catch {
            resolve({ status: res.statusCode || 200, data });
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
          // Access private method via type assertion for testing
          await (app as any).handleRequest(req, res);
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err?.message || 'Internal error' }));
        }
      });
      server.listen(port, () => resolve());
    });
  };

  describe('GET routes', () => {
    beforeEach(async () => {
      app = createApp();
      app.route('/ping').get(() => ({ message: 'pong' }));
      app.route('/users/:id').get((id) => ({ userId: id }));
      await startServer();
    });

    it('should handle simple GET request', async () => {
      const response = await makeRequest('GET', '/ping');
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ message: 'pong' });
    });

    it('should handle route parameters', async () => {
      const response = await makeRequest('GET', '/users/123');
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ userId: '123' });
    });

    it('should return 404 for non-existent route', async () => {
      const response = await makeRequest('GET', '/not-found');
      expect(response.status).toBe(404);
      expect(response.data.error).toContain('not found');
    });
  });

  describe('POST routes', () => {
    beforeEach(async () => {
      app = createApp();
      await app.plugin(require('../../src/plugins/bodyParser').bodyParserPlugin);
      app.route('/users').post((body) => ({ created: true, data: body }));
      await startServer();
    });

    it('should handle POST request with body', async () => {
      const body = { name: 'John', email: 'john@example.com' };
      const response = await makeRequest('POST', '/users', body);
      expect(response.status).toBe(200);
      expect(response.data.created).toBe(true);
      expect(response.data.data).toEqual(body);
    });
  });

  describe('PUT routes', () => {
    beforeEach(async () => {
      app = createApp();
      await app.plugin(require('../../src/plugins/bodyParser').bodyParserPlugin);
      app.route('/users/:id').put((params, body) => ({
        updated: true,
        id: params.id,
        data: body,
      }));
      await startServer();
    });

    it('should handle PUT request', async () => {
      const body = { name: 'Jane' };
      const response = await makeRequest('PUT', '/users/123', body);
      expect(response.status).toBe(200);
      expect(response.data.updated).toBe(true);
      expect(response.data.id).toBe('123');
      expect(response.data.data).toEqual(body);
    });
  });

  describe('DELETE routes', () => {
    beforeEach(async () => {
      app = createApp();
      app.route('/users/:id').delete((id) => ({ deleted: true, userId: id }));
      await startServer();
    });

    it('should handle DELETE request', async () => {
      const response = await makeRequest('DELETE', '/users/123');
      expect(response.status).toBe(200);
      expect(response.data.deleted).toBe(true);
      expect(response.data.userId).toBe('123');
    });
  });

  describe('Multiple routes', () => {
    beforeEach(async () => {
      app = createApp();
      app.route('/users/:id')
        .get((id) => ({ method: 'GET', id }))
        .post((params, body) => ({ method: 'POST', id: params.id, body }))
        .put((params, body) => ({ method: 'PUT', id: params.id, body }))
        .delete((id) => ({ method: 'DELETE', id }));
      await app.plugin(require('../../src/plugins/bodyParser').bodyParserPlugin);
      await startServer();
    });

    it('should handle GET on same path', async () => {
      const response = await makeRequest('GET', '/users/123');
      expect(response.data.method).toBe('GET');
    });

    it('should handle POST on same path', async () => {
      const response = await makeRequest('POST', '/users/123', { name: 'Test' });
      expect(response.data.method).toBe('POST');
    });

    it('should handle PUT on same path', async () => {
      const response = await makeRequest('PUT', '/users/123', { name: 'Test' });
      expect(response.data.method).toBe('PUT');
    });

    it('should handle DELETE on same path', async () => {
      const response = await makeRequest('DELETE', '/users/123');
      expect(response.data.method).toBe('DELETE');
    });
  });
});

