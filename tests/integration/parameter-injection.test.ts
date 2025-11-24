import http from 'http';
import { createApp } from '../../src/core/app';

describe('Parameter Injection Integration Tests', () => {
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
            resolve({ status: res.statusCode || 200, data: JSON.parse(data) });
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
          await (app as any).handleRequest(req, res);
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err?.message || 'Internal error' }));
        }
      });
      server.listen(port, () => resolve());
    });
  };

  describe('GET Parameter Flattening', () => {
    beforeEach(async () => {
      app = createApp();
      app.route('/users/:id').get((id) => ({ userId: id }));
      app.route('/users/:userId/posts/:postId').get((userId, postId) => ({
        userId,
        postId,
      }));
      await startServer();
    });

    it('should flatten single parameter', async () => {
      const response = await makeRequest('GET', '/users/123');
      expect(response.data.userId).toBe('123');
    });

    it('should flatten multiple parameters', async () => {
      const response = await makeRequest('GET', '/users/1/posts/2');
      expect(response.data.userId).toBe('1');
      expect(response.data.postId).toBe('2');
    });
  });

  describe('POST Parameter Grouping', () => {
    beforeEach(async () => {
      app = createApp();
      await app.plugin(require('../../src/plugins/bodyParser').bodyParserPlugin);
      app.route('/users/:id').post((params, body) => ({
        userId: params.id,
        userData: body,
      }));
      await startServer();
    });

    it('should group params and flatten body', async () => {
      const body = { name: 'John', email: 'john@example.com' };
      const response = await makeRequest('POST', '/users/123', body);
      expect(response.data.userId).toBe('123');
      expect(response.data.userData).toEqual(body);
    });
  });

  describe('Query Parameters', () => {
    beforeEach(async () => {
      app = createApp();
      app.route('/search').get((query) => ({ query }));
      await startServer();
    });

    it('should inject query parameters', async () => {
      const response = await makeRequest('GET', '/search?q=test&page=1');
      expect(response.data.query).toEqual({ q: 'test', page: '1' });
    });
  });

  describe('Middleware + Route Parameters', () => {
    beforeEach(async () => {
      app = createApp();
      app.middleware(async () => ({ user: { id: 1, name: 'John' } }));
      app.route('/users/:id').get((id, user) => ({
        routeId: id,
        user,
      }));
      await startServer();
    });

    it('should inject both route params and middleware values', async () => {
      const response = await makeRequest('GET', '/users/123');
      expect(response.data.routeId).toBe('123');
      expect(response.data.user).toEqual({ id: 1, name: 'John' });
    });
  });
});

