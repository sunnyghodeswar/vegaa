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
 * Escape string for safe use in property access
 * Prevents code injection in parameter names
 */
function escapePropertyName(name: string): string {
  // Parameter names are already sanitized by sanitizeName(),
  // but add extra escaping for property access to be safe
  // Replace any single quotes with escaped version
  return name.replace(/'/g, "\\'").replace(/\\/g, '\\\\')
}

/**
 * Validate parameter names are safe for code generation
 * Additional security check beyond sanitizeName()
 */
function validateParamNames(paramNames: string[]): boolean {
  for (const name of paramNames) {
    // Double-check: names should already be sanitized, but verify
    if (typeof name !== 'string') return false
    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) return false
    // Reject suspicious patterns
    if (name.includes('__') || name.includes('eval') || name.includes('Function')) {
      return false
    }
  }
  return true
}

/**
 * compileArgBuilder:
 * - if handler uses (ctx) or (context) → passes full ctx
 * - otherwise injects requested ctx keys, e.g. (body, user, params)
 *
 * Compiles once per handler registration (fast, no runtime eval).
 * 
 * Security: Parameter names are validated and escaped to prevent code injection.
 */
export function compileArgBuilder(paramNames: string[]): (ctx: any) => any[] {
  if (paramNames.length === 0) return () => []
  
  // Additional security validation
  if (!validateParamNames(paramNames)) {
    // If validation fails, fall back to passing context
    console.warn('[Vegaa] Invalid parameter names detected, falling back to context injection')
    return (ctx: any) => [ctx]
  }
  
  const first = (paramNames[0] || '').toLowerCase()
  if (paramNames.length === 1 && (first === 'ctx' || first === 'context')) {
    return (ctx: any) => [ctx]
  }

  // Build optimized Function body with escaped property names
  const parts: string[] = []
  for (const n of paramNames) {
    const escaped = escapePropertyName(n)
    // Use bracket notation with escaped string for safety
    parts.push(`ctx['${escaped}'] ?? undefined`)
  }
  const fnBody = `return [${parts.join(',')}];`

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function('ctx', fnBody) as (ctx: any) => any[]
    return fn
  } catch (err) {
    // If compilation fails (shouldn't happen with validated names), fall back
    console.warn('[Vegaa] Failed to compile arg builder, falling back to context:', err)
    return (ctx: any) => [ctx]
  }
}