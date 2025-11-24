import type { Context, Handler, Route, MiddlewareEntry } from '../../../src/core/types';

describe('Type Definitions', () => {
  describe('Context', () => {
    it('should have required properties', () => {
      const ctx: Context = {
        req: {} as any,
        res: {} as any,
        pathname: '/test',
        query: {},
        params: {},
        _ended: false,
        makeRequest: () => ({} as any),
      };
      expect(ctx.pathname).toBe('/test');
      expect(ctx.query).toEqual({});
      expect(ctx.params).toEqual({});
    });

    it('should allow dynamic properties', () => {
      const ctx: Context = {
        req: {} as any,
        res: {} as any,
        pathname: '/test',
        query: {},
        params: {},
        _ended: false,
        makeRequest: () => ({} as any),
        customProp: 'value',
      };
      expect((ctx as any).customProp).toBe('value');
    });
  });

  describe('Handler', () => {
    it('should accept context parameter', () => {
      const handler: Handler = (ctx: Context) => ({ result: 'ok' });
      expect(typeof handler).toBe('function');
    });

    it('should accept destructured parameters', () => {
      const handler: Handler = (id: string, user: any) => ({ id, user });
      expect(typeof handler).toBe('function');
    });
  });
});

