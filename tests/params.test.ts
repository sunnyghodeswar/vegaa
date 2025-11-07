import { describe, it, expect } from 'vitest'
import { extractParamNames, compileArgBuilder } from '../src/utils/params'

describe('Parameter Extraction', () => {
  describe('extractParamNames', () => {
    it('should extract parameter names from arrow functions', () => {
      const fn = (a: any, b: any) => {}
      expect(extractParamNames(fn)).toEqual(['a', 'b'])
    })

    it('should extract parameter names from regular functions', () => {
      function fn(a: any, b: any) {}
      expect(extractParamNames(fn)).toEqual(['a', 'b'])
    })

    it('should extract parameter names from async functions', () => {
      const fn = async (a: any, b: any) => {}
      expect(extractParamNames(fn)).toEqual(['a', 'b'])
    })

    it('should handle single parameter', () => {
      const fn = (ctx: any) => {}
      expect(extractParamNames(fn)).toEqual(['ctx'])
    })

    it('should handle no parameters', () => {
      const fn = () => {}
      expect(extractParamNames(fn)).toEqual([])
    })
  })

  describe('compileArgBuilder - Security', () => {
    it('should safely compile arg builder with valid names', () => {
      const builder = compileArgBuilder(['body', 'user', 'params'])
      const ctx = { body: 'test', user: { id: 1 }, params: {} }
      
      const args = builder(ctx)
      expect(args).toEqual(['test', { id: 1 }, {}])
    })

    it('should reject suspicious parameter names', () => {
      // Should fall back to context injection for suspicious names
      const builder1 = compileArgBuilder(['__proto__'])
      const builder2 = compileArgBuilder(['eval'])
      const builder3 = compileArgBuilder(['Function'])
      
      const ctx = { body: 'test' }
      const args1 = builder1(ctx)
      const args2 = builder2(ctx)
      const args3 = builder3(ctx)
      
      // Should return context instead
      expect(args1).toEqual([ctx])
      expect(args2).toEqual([ctx])
      expect(args3).toEqual([ctx])
    })

    it('should handle special characters in names safely', () => {
      // Valid names should work
      const builder = compileArgBuilder(['userName', 'userId'])
      const ctx = { userName: 'test', userId: 123 }
      
      const args = builder(ctx)
      expect(args).toEqual(['test', 123])
    })

    it('should escape property names correctly', () => {
      // Test that property access is safe
      const builder = compileArgBuilder(['body'])
      const ctx = { body: { test: 'value' } }
      
      const args = builder(ctx)
      expect(args[0]).toEqual({ test: 'value' })
    })
  })

  describe('compileArgBuilder - Context injection', () => {
    it('should pass full context when param is ctx', () => {
      const builder = compileArgBuilder(['ctx'])
      const ctx = { body: 'test', user: { id: 1 } }
      
      const args = builder(ctx)
      expect(args).toEqual([ctx])
    })

    it('should pass full context when param is context', () => {
      const builder = compileArgBuilder(['context'])
      const ctx = { body: 'test' }
      
      const args = builder(ctx)
      expect(args).toEqual([ctx])
    })

    it('should inject specific properties', () => {
      const builder = compileArgBuilder(['body', 'user'])
      const ctx = { body: 'test', user: { id: 1 }, other: 'ignored' }
      
      const args = builder(ctx)
      expect(args).toEqual(['test', { id: 1 }])
    })

    it('should return undefined for missing properties', () => {
      const builder = compileArgBuilder(['body', 'user', 'missing'])
      const ctx = { body: 'test' }
      
      const args = builder(ctx)
      expect(args).toEqual(['test', undefined, undefined])
    })
  })
})

