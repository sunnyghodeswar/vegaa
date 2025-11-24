import http from 'http';
import { buildContext } from '../../../src/utils/context';
import type { Context } from '../../../src/core/types';

describe('Context Builder', () => {
  let req: http.IncomingMessage;
  let res: http.ServerResponse;

  beforeEach(() => {
    req = {
      method: 'GET',
      url: '/test?foo=bar',
      headers: {},
    } as any;
    res = {
      statusCode: 200,
      setHeader: jest.fn(),
      end: jest.fn(),
      headersSent: false,
      writableEnded: false,
    } as any;
  });

  describe('buildContext()', () => {
    it('should create context with basic properties', () => {
      const ctx = buildContext(req, res);
      expect(ctx.req).toBe(req);
      expect(ctx.res).toBe(res);
      expect(ctx.pathname).toBe('/test');
      expect(ctx.query).toEqual({ foo: 'bar' });
      expect(ctx.params).toEqual({});
    });

    it('should parse query parameters', () => {
      req.url = '/test?a=1&b=2&c=hello';
      const ctx = buildContext(req, res);
      expect(ctx.query).toEqual({ a: '1', b: '2', c: 'hello' });
    });

    it('should handle URL without query string', () => {
      req.url = '/test';
      const ctx = buildContext(req, res);
      expect(ctx.pathname).toBe('/test');
      expect(ctx.query).toEqual({});
    });

    it('should handle empty query string', () => {
      req.url = '/test?';
      const ctx = buildContext(req, res);
      expect(ctx.pathname).toBe('/test');
      expect(ctx.query).toEqual({});
    });

    it('should set default pathname', () => {
      req.url = undefined;
      const ctx = buildContext(req, res);
      expect(ctx.pathname).toBe('/');
    });
  });

  describe('Response helpers', () => {
    it('should add status() method', () => {
      const ctx = buildContext(req, res);
      ctx.res.status(404);
      expect(res.statusCode).toBe(404);
    });

    it('should add type() method', () => {
      const ctx = buildContext(req, res);
      ctx.res.type('application/json');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
    });

    it('should add json() method', () => {
      const ctx = buildContext(req, res);
      ctx.res.json({ test: 'value' });
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(res.end).toHaveBeenCalled();
      expect(ctx._ended).toBe(true);
    });

    it('should add send() method', () => {
      const ctx = buildContext(req, res);
      ctx.res.send({ test: 'value' });
      expect(res.end).toHaveBeenCalled();
      expect(ctx._ended).toBe(true);
    });

    it('should add html() method', () => {
      const ctx = buildContext(req, res);
      ctx.res.html('<h1>Test</h1>');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html; charset=utf-8');
      expect(res.end).toHaveBeenCalled();
      expect(ctx._ended).toBe(true);
    });

    it('should add text() method', () => {
      const ctx = buildContext(req, res);
      ctx.res.text('Hello');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain; charset=utf-8');
      expect(res.end).toHaveBeenCalled();
      expect(ctx._ended).toBe(true);
    });
  });
});

