/**
 * src/utils/response.ts
 *
 * Functional response helpers for Vegaa
 * --------------------------------------
 * These functions return special response objects that the core app
 * detects and handles appropriately, following the framework's design language.
 */

// Response type markers
export const HTML_RESPONSE = Symbol('HTML_RESPONSE')
export const TEXT_RESPONSE = Symbol('TEXT_RESPONSE')
export const FILE_RESPONSE = Symbol('FILE_RESPONSE')

/**
 * Return HTML content
 */
export function html(content: string) {
  return {
    _type: HTML_RESPONSE,
    content,
  }
}

/**
 * Return plain text content
 */
export function text(content: string) {
  return {
    _type: TEXT_RESPONSE,
    content,
  }
}

/**
 * Return a file to serve
 */
export function file(filePath: string) {
  return {
    _type: FILE_RESPONSE,
    path: filePath,
  }
}

/**
 * Check if an object is a special response type
 */
export function isSpecialResponse(obj: any): boolean {
  return obj && (
    obj._type === HTML_RESPONSE ||
    obj._type === TEXT_RESPONSE ||
    obj._type === FILE_RESPONSE
  )
}

