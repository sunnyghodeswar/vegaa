/**
 * Param extraction & argument builder utilities
 * ---------------------------------------------
 * - extractParamNames: safely parse function parameter names (supports arrow & regular)
 * - compileArgBuilder: builds optimized function to map ctx → [ctx.body, ctx.user, ...]
 *
 * This enables auto-injection of context fields as top-level handler arguments.
 */

const PARAMS_RE = /^\s*(?:async\s*)?(?:function\b[^(]*\(|\()([^)]*)\)/
const SIMPLE_ARROW_RE = /^\s*(?:async\s*)?\(?\s*([^)=]*)\s*\)?\s*=>/

function sanitizeName(n: string): string | null {
  const s = n.replace(/\/\*.*\*\//g, '').replace(/\/\/.*$/gm, '').trim()
  if (!s) return null
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(s)) return null
  return s
}

/**
 * Extract parameter names from a function definition.
 * Handles async, arrow, and default values.
 */
export function extractParamNames(fn: Function): string[] {
  const src = Function.prototype.toString.call(fn)
  let match = src.match(SIMPLE_ARROW_RE)
  if (!match) match = src.match(PARAMS_RE)
  if (!match) return []
  const inside = match[1] || ''
  if (!inside) return []
  const parts = inside.split(',').map(p => p.trim()).filter(Boolean)
  const out: string[] = []
  for (const p of parts) {
    const name = p.split('=')[0].trim().replace(/^[\s.]*\.\.\./, '').trim()
    const s = sanitizeName(name)
    if (s) out.push(s)
  }
  return out
}

/**
 * compileArgBuilder:
 * - if handler uses (ctx) or (context) → passes full ctx
 * - otherwise injects requested ctx keys, e.g. (body, user, params)
 *
 * Compiles once per handler registration (fast, no runtime eval).
 */
export function compileArgBuilder(paramNames: string[]): (ctx: any) => any[] {
  if (paramNames.length === 0) return () => []
  const first = (paramNames[0] || '').toLowerCase()
  if (paramNames.length === 1 && (first === 'ctx' || first === 'context')) {
    return (ctx: any) => [ctx]
  }

  // Build optimized Function body
  const parts: string[] = []
  for (const n of paramNames) {
    parts.push(`ctx['${n}'] ?? undefined`)
  }
  const fnBody = `return [${parts.join(',')}];`

  // eslint-disable-next-line no-new-func
  const fn = new Function('ctx', fnBody) as (ctx: any) => any[]
  return fn
}