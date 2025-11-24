import http from 'http';
import { createApp } from '../../src/core/app';
import { html, text } from '../../src/utils/response';

describe('Response Types Integration Tests', () => {
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

  const makeRequest = (path: string): Promise<{ status: number; data: any; headers: any }> => {
    return new Promise((resolve, reject) => {
      const req = http.request(
        { hostname: 'localhost', port, path, method: 'GET' },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              resolve({
                status: res.statusCode || 200,
                data: res.headers['content-type']?.includes('application/json') ? JSON.parse(data) : data,
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

  describe('JSON Response (Default)', () => {
    beforeEach(async () => {
      app = createApp();
      app.route('/json').get(() => ({ type: 'json', message: 'Hello' }));
      await startServer();
    });

    it('should return JSON by default', async () => {
      const response = await makeRequest('/json');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.data).toEqual({ type: 'json', message: 'Hello' });
    });
  });

  describe('HTML Response', () => {
    beforeEach(async () => {
      app = createApp();
      app.route('/html').get(() => html('<h1>Hello</h1>'));
      await startServer();
    });

    it('should return HTML content', async () => {
      const response = await makeRequest('/html');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.data).toBe('<h1>Hello</h1>');
    });
  });

  describe('Text Response', () => {
    beforeEach(async () => {
      app = createApp();
      app.route('/text').get(() => text('Plain text response'));
      await startServer();
    });

    it('should return text content', async () => {
      const response = await makeRequest('/text');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.data).toBe('Plain text response');
    });
  });

  describe('Mixed Response Types', () => {
    beforeEach(async () => {
      app = createApp();
      app.route('/type/:format').get((format) => {
        if (format === 'html') return html('<h1>HTML</h1>');
        if (format === 'text') return text('Text');
        return { type: 'json', format };
      });
      await startServer();
    });

    it('should return HTML for html format', async () => {
      const response = await makeRequest('/type/html');
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.data).toBe('<h1>HTML</h1>');
    });

    it('should return text for text format', async () => {
      const response = await makeRequest('/type/text');
      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.data).toBe('Text');
    });

    it('should return JSON for other formats', async () => {
      const response = await makeRequest('/type/json');
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.data).toEqual({ type: 'json', format: 'json' });
    });
  });
});

