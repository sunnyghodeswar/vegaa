import { fetch } from 'undici'

export function makeRequest(defaults?: { timeout?: number }) {
  let config: {
    url?: string
    method?: string
    headers?: Record<string, string>
    body?: any
    timeout?: number
  } = { method: 'GET', headers: {}, timeout: defaults?.timeout }

  const builder = {
    url(u: string) { config.url = u; return builder },
    method(m: string) { config.method = m.toUpperCase(); return builder },
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
    timeout(ms: number) { config.timeout = ms; return builder },
    async json<T = any>(): Promise<T> {
      const res = await fetch(config.url!, {
        method: config.method,
        headers: config.headers,
        body: config.body,
        signal: config.timeout
          ? AbortSignal.timeout(config.timeout)
          : undefined
      })
      return res.json() as Promise<T>
    },
    async text() {
      const res = await fetch(config.url!, config as any)
      return res.text()
    },
    async buffer() {
      const res = await fetch(config.url!, config as any)
      return Buffer.from(await res.arrayBuffer())
    }
  }

  return builder
}