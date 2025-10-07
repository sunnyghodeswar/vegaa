import { makeRequest } from '../utils/makeRequest'
import type { App } from '../core/app'

export const httpClientPlugin = {
  async register(app: App, opts?: { timeout?: number }) {
    // Decorate context with makeRequest factory
    app.middleware(async () => ({
      makeRequest: () => makeRequest(opts)
    }))
  }
}