// src/utils/params.ts
const PARAMS_RE = /^\s*(?:async\s*)?(?:function\b[^(]*\(|\()([^)]*)\)/
const SIMPLE_ARROW_RE = /^\s*(?:async\s*)?\(?\s*([^)=]*)\s*\)?\s*=>/

function sanitizeName(n: string): string | null {
  const s = n.replace(/\/\*.*\*\//g, '').replace(/\/\/.*$/gm, '').trim()
  if (!s) return null
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(s)) return null
  return s
}

export function extractParamNames(fn: Function): string[] {
  const src = fn.toString()
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

export function compileArgBuilder(paramNames: string[]): ((ctx: any) => any[]) {
  if (paramNames.length === 0) return () => []
  const first = paramNames[0]?.toLowerCase()
  if (paramNames.length === 1 && (first === 'ctx' || first === 'context')) {
    return (ctx: any) => [ctx]
  }

  const parts: string[] = []
  for (const n of paramNames) {
    parts.push(`ctx['${n}'] ?? undefined`)
  }
  const fnBody = `return [${parts.join(',')}];`
  // new Function compiled once per route registration
  // paramNames are sanitized so this is safe
  // eslint-disable-next-line no-new-func
  const f = new Function('ctx', fnBody) as (ctx: any) => any[]
  return f
}