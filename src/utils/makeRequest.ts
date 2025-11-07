import { fetch } from 'undici'

/**
 * Create an AbortSignal with timeout
 * Reusable and properly handles cleanup
 */
function createTimeoutSignal(timeoutMs: number): AbortSignal {
  if (typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs)
  }
  
  // Fallback for older Node.js versions
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  
  // Store timeout for potential cleanup (though it will auto-cleanup on abort)
  ;(controller as any)._timeout = timeout
  
  return controller.signal
}

/**
 * Make HTTP request with builder pattern
 * 
 * Features:
 * - Consistent timeout handling across all methods
 * - Proper error handling for timeouts
 * - URL validation
 */
export function makeRequest(defaults?: { timeout?: number }) {
  let config: {
    url?: string
    method?: string
    headers?: Record<string, string>
    body?: any
    timeout?: number
  } = { method: 'GET', headers: {}, timeout: defaults?.timeout }

  // Create abort signal once and reuse
  let abortSignal: AbortSignal | undefined
  let signalCreated = false

  const getAbortSignal = (): AbortSignal | undefined => {
    if (!config.timeout || config.timeout <= 0) return undefined
    
    // Create signal lazily when first needed
    if (!signalCreated) {
      abortSignal = createTimeoutSignal(config.timeout)
      signalCreated = true
    }
    
    return abortSignal
  }

  const makeFetchRequest = async (): Promise<Response> => {
    if (!config.url) {
      throw new Error('URL is required. Call .url() before making request.')
    }

    // Validate URL format
    try {
      new URL(config.url)
    } catch {
      throw new Error(`Invalid URL: ${config.url}`)
    }

    const signal = getAbortSignal()
    
    try {
      const res = await fetch(config.url, {
        method: config.method,
        headers: config.headers,
        body: config.body,
        signal
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }

      return res as any as Response
    } catch (err: any) {
      // Handle timeout specifically
      if (err.name === 'AbortError' || err.name === 'TimeoutError') {
        throw new Error(`Request timeout after ${config.timeout}ms`)
      }
      throw err
    }
  }

  const builder = {
    url(u: string) { 
      config.url = u
      // Reset signal if URL changes (new request)
      signalCreated = false
      abortSignal = undefined
      return builder 
    },
    method(m: string) { 
      config.method = m.toUpperCase()
      return builder 
    },
    get() { return builder.method('GET') },
    post() { return builder.method('POST') },
    put() { return builder.method('PUT') },
    delete() { return builder.method('DELETE') },
    patch() { return builder.method('PATCH') },
    headers(h: Record<string, string>) {
      config.headers = { ...config.headers, ...h }
      return builder
    },
    body(b: any) {
      config.body = typeof b === 'object' ? JSON.stringify(b) : b
      if (typeof b === 'object')
        config.headers!['Content-Type'] = 'application/json'
      return builder
    },
    timeout(ms: number) { 
      if (typeof ms !== 'number' || ms <= 0) {
        throw new Error('Timeout must be a positive number')
      }
      config.timeout = ms
      // Reset signal when timeout changes
      signalCreated = false
      abortSignal = undefined
      return builder 
    },
    async json<T = any>(): Promise<T> {
      const res = await makeFetchRequest()
      return res.json() as Promise<T>
    },
    async text(): Promise<string> {
      const res = await makeFetchRequest()
      return res.text()
    },
    async buffer(): Promise<Buffer> {
      const res = await makeFetchRequest()
      return Buffer.from(await res.arrayBuffer())
    }
  }

  return builder
}