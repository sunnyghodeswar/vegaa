import type { MakeRequestBuilder } from './types'

declare global {
  // Allow route handler param inference
  type MakeRequest = () => MakeRequestBuilder
}