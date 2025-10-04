import type { App } from './app'
import type { Handler } from './types'

export interface Plugin {
  name?: string
  version?: string
  register(app: App): Promise<void> | void
}

export function isPlugin(obj: any): obj is Plugin {
  return obj && typeof obj.register === 'function'
}

export function isMiddleware(obj: any): obj is Handler {
  return typeof obj === 'function'
}