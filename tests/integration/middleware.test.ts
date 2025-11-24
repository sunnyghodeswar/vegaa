import http from 'http';
import { createApp } from '../../src/core/app';

describe('Middleware Integration Tests', () => {
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

  describe('Global Middleware', () => {
    beforeEach(async () => {
      app = createApp();
      app.middleware(async () => ({ user: { id: 1, name: 'John' } }));
      app.middleware(async (user) => ({ greeting: `Hello ${user.name}` }));
      app.route('/profile').get((user, greeting) => ({ user, greeting }));
      await startServer();
    });

    it('should inject middleware values into handler', async () => {
      const response = await makeRequest('/profile');
      expect(response.status).toBe(200);
      expect(response.data.user).toEqual({ id: 1, name: 'John' });
      expect(response.data.greeting).toBe('Hello John');
    });
  });

  describe('Route-Specific Middleware', () => {
    beforeEach(async () => {
      app = createApp();
      app.middleware(async () => ({ global: 'value' }));
      app.route('/admin')
        .middleware(() => ({ role: 'admin' }))
        .get((global, role) => ({ global, role }));
      app.route('/user')
        .middleware(() => ({ role: 'user' }))
        .get((global, role) => ({ global, role }));
      await startServer();
    });

    it('should apply route middleware to specific route', async () => {
      const response = await makeRequest('/admin');
      expect(response.status).toBe(200);
      expect(response.data.role).toBe('admin');
      expect(response.data.global).toBe('value');
    });

    it('should not apply route middleware to other routes', async () => {
      const response = await makeRequest('/user');
      expect(response.status).toBe(200);
      expect(response.data.role).toBe('user');
    });
  });

  describe('Middleware Chaining', () => {
    beforeEach(async () => {
      app = createApp();
      app.middleware([
        async () => ({ step1: 'done' }),
        async (step1) => ({ step2: `${step1} -> done` }),
        async (step1, step2) => ({ step3: `${step2} -> done` }),
      ]);
      app.route('/chain').get((step1, step2, step3) => ({ step1, step2, step3 }));
      await startServer();
    });

    it('should chain middleware values', async () => {
      const response = await makeRequest('/chain');
      expect(response.status).toBe(200);
      expect(response.data.step1).toBe('done');
      expect(response.data.step2).toBe('done -> done');
      expect(response.data.step3).toBe('done -> done -> done');
    });
  });

  describe('Middleware Error Handling', () => {
    beforeEach(async () => {
      app = createApp();
      app.middleware(async () => {
        throw new Error('Middleware error');
      });
      app.route('/error').get(() => ({ success: true }));
      app.onError(async (ctx, err) => {
        ctx.res.statusCode = 500;
        ctx.res.end(JSON.stringify({ error: err.message }));
      });
      await startServer();
    });

    it('should handle middleware errors', async () => {
      const response = await makeRequest('/error');
      expect(response.status).toBe(500);
      expect(response.data.error).toBe('Middleware error');
    });
  });
});

