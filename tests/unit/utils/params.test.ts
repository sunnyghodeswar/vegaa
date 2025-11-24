import { extractParamNames, compileArgBuilder } from '../../../src/utils/params';

describe('Parameter Extraction', () => {
  describe('extractParamNames()', () => {
    it('should extract single parameter', () => {
      const fn = (id: string) => {};
      const names = extractParamNames(fn);
      expect(names).toEqual(['id']);
    });

    it('should extract multiple parameters', () => {
      const fn = (id: string, user: any, body: any) => {};
      const names = extractParamNames(fn);
      expect(names).toEqual(['id', 'user', 'body']);
    });

    it('should handle arrow functions', () => {
      const fn = (id: string) => {};
      const names = extractParamNames(fn);
      expect(names).toEqual(['id']);
    });

    it('should handle async functions', () => {
      const fn = async (id: string) => {};
      const names = extractParamNames(fn);
      expect(names).toEqual(['id']);
    });

    it('should handle functions with default parameters', () => {
      const fn = (id: string = 'default') => {};
      const names = extractParamNames(fn);
      expect(names).toEqual(['id']);
    });

    it('should handle rest parameters', () => {
      const fn = (...args: any[]) => {};
      const names = extractParamNames(fn);
      expect(names).toEqual([]); // Rest params are excluded
    });

    it('should handle empty parameter list', () => {
      const fn = () => {};
      const names = extractParamNames(fn);
      expect(names).toEqual([]);
    });

    it('should handle context parameter', () => {
      const fn = (ctx: any) => {};
      const names = extractParamNames(fn);
      expect(names).toEqual(['ctx']);
    });
  });

  describe('compileArgBuilder()', () => {
    it('should return empty array for no params', () => {
      const builder = compileArgBuilder([]);
      expect(builder({})).toEqual([]);
    });

    it('should return context for single ctx parameter', () => {
      const builder = compileArgBuilder(['ctx']);
      const ctx = { test: 'value' };
      expect(builder(ctx)).toEqual([ctx]);
    });

    it('should return context for single context parameter', () => {
      const builder = compileArgBuilder(['context']);
      const ctx = { test: 'value' };
      expect(builder(ctx)).toEqual([ctx]);
    });

    it('should build arguments from context properties', () => {
      const builder = compileArgBuilder(['id', 'user']);
      const ctx = {
        id: '123',
        user: { name: 'John' },
        other: 'ignored',
      };
      const args = builder(ctx);
      expect(args).toEqual(['123', { name: 'John' }]);
    });

    it('should handle undefined values', () => {
      const builder = compileArgBuilder(['id', 'user']);
      const ctx = { id: '123' };
      const args = builder(ctx);
      expect(args).toEqual(['123', undefined]);
    });

    it('should handle multiple parameters', () => {
      const builder = compileArgBuilder(['a', 'b', 'c', 'd']);
      const ctx = { a: 1, b: 2, c: 3, d: 4 };
      const args = builder(ctx);
      expect(args).toEqual([1, 2, 3, 4]);
    });
  });
});

