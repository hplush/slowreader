import { detectNetworkError, HTTPStatusError, ParseError } from '../errors.ts'
import { request } from '../request.ts'

/**
 * Extracts encoding from XML declaration, e.g., "ISO-8859-1" from
 * `<?xml version="1.0" encoding="ISO-8859-1"?>`.
 */
function extractXmlEncoding(text: string): string | undefined {
  let match = text.match(/^<\?xml\s+[^>]*encoding\s*=\s*["']([^"']+)["']/i)
  return match?.[1]?.toUpperCase()
}

/**
 * Attempts to extract charset from Content-Type header, e.g., "ISO-8859-1" from
 * `Content-Type: text/html; charset=ISO-8859-1`.
 */
function extractCharsetFromHeader(
  headers: Headers | undefined
): string | undefined {
  if (!headers?.get) return undefined
  let contentType = headers.get('content-type')
  if (!contentType) return undefined
  let match = contentType.match(/charset\s*=\s*([^\s;]+)/i)
  return match?.[1]?.toLowerCase().replace(/^["']|["']$/g, '')
}

let cache = new Map<string, Response>()

type JSONDocument = boolean | null | number | object | string

export interface TextResponse {
  readonly contentType: string
  readonly headers: Headers
  parseJson(): JSONDocument
  parseXml(): Document | XMLDocument
  readonly redirected: boolean
  readonly status: number
  readonly text: string
  tryParseHTML(): Document | false | XMLDocument
  readonly url: string
}

/**
 * Combine all relative HTTP requests to cancel all of them fast.
 */
export interface DownloadTask {
  destroy(): void
  request: typeof request
  text(...args: Parameters<typeof request>): Promise<TextResponse>
}

/**
 * Detects content type by analyzing the text content for common patterns
 * like HTML doctype, XML declarations, RSS/Atom feed elements,
 * and JSON Feed format.
 */
function detectType(text: string): string | undefined {
  let lower = text.toLowerCase()
  let beginning = lower.slice(0, 100)
  if (/^\s*<!doctype html/i.test(beginning)) {
    return 'text/html'
  } else if (/^\s*<\?xml/i.test(beginning)) {
    if (lower.includes('<rss')) {
      return 'application/rss+xml'
    } else if (lower.includes('<feed')) {
      return 'application/atom+xml'
    } else {
      return 'application/xml'
    }
  } else if (lower.includes('<rss')) {
    return 'application/rss+xml'
  } else if (lower.includes('<feed')) {
    return 'application/atom+xml'
  } else if (lower.includes('<html')) {
    return 'text/html'
  } else if (
    /^\s*\{/.test(beginning) &&
    lower.includes('"version":"https://jsonfeed.org/version/1"')
  ) {
    return 'application/json'
  }
}

function fixPopularIssues(text: string): string {
  return text.replace(/^\s+<\?xml /i, '<?xml ')
}

/**
 * Decodes bytes using the appropriate encoding based on XML declaration
 * and HTTP Content-Type header. Tries declared encoding first if it differs
 * from the header charset.
 */
function decodeWithProperEncoding(
  buffer: Uint8Array,
  headerCharset: string = 'utf-8'
): string {
  try {
    let decoded = new TextDecoder(headerCharset).decode(buffer)
    let xmlEncoding = extractXmlEncoding(decoded)
    if (xmlEncoding && xmlEncoding !== headerCharset.toUpperCase()) {
      try {
        return new TextDecoder(xmlEncoding).decode(buffer)
      } catch {}
    }
    return decoded
  } catch {
    return new TextDecoder('utf-8').decode(buffer)
  }
}

export function createTextResponse(
  text: string,
  other: Partial<Omit<TextResponse, 'ok' | 'text'>> = {}
): TextResponse {
  let status = other.status ?? 200
  let headers = other.headers ?? new Headers()
  let xmlCache: Document | undefined | XMLDocument
  let jsonCache: JSONDocument | undefined

  let contentType =
    detectType(text) ?? headers.get('content-type') ?? 'text/plain'
  if (contentType.includes(';')) {
    contentType = contentType.split(';')[0]!
  }

  return {
    contentType,
    headers,
    parseJson() {
      if (!jsonCache) {
        if (
          contentType !== 'application/json' &&
          contentType !== 'application/feed+json'
        ) {
          throw new ParseError('Unknown content type: ' + contentType, text)
        }

        try {
          jsonCache = JSON.parse(text) as JSONDocument
        } catch (e) {
          if (e instanceof SyntaxError) {
            throw new ParseError(e.message, text)
          } else {
            throw e
          }
        }
      }
      return jsonCache
    },
    parseXml() {
      if (!xmlCache) {
        if (contentType.includes('+xml')) {
          contentType = 'application/xml'
        }
        if (
          contentType === 'text/html' ||
          contentType === 'application/xml' ||
          contentType === 'text/xml'
        ) {
          let fixed = fixPopularIssues(text)
          let parsed = new DOMParser().parseFromString(fixed, contentType)
          if (parsed.documentElement.tagName === 'parsererror') {
            let error = new ParseError(
              parsed.documentElement.textContent,
              fixed
            )
            throw error
          } else {
            xmlCache = parsed
          }
        } else {
          throw new ParseError('Unknown content type: ' + contentType, text)
        }
      }
      return xmlCache
    },
    redirected: other.redirected ?? false,
    status,
    text,
    tryParseHTML() {
      if (xmlCache) return xmlCache
      if (!/<html/i.test(text)) return false
      if (contentType !== 'text/html') return false
      /* node:coverage ignore next 5 */
      try {
        return this.parseXml()
      } catch {
        return false
      }
    },
    url: other.url ?? 'https://example.com'
  }
}

export function createDownloadTask(
  taskOpts: { cache?: 'read' | 'write' | false } = {}
): DownloadTask {
  let controller = new AbortController()
  let cached: string[] = []
  return {
    destroy() {
      for (let url of cached) cache.delete(url)
      controller.abort()
    },
    async request(url, opts = {}) {
      if (taskOpts.cache) {
        let fromCache = cache.get(url)
        if (fromCache) {
          let clone = fromCache.clone()
          Object.defineProperty(clone, 'url', { value: url })
          return clone
        }
      }

      let response = await detectNetworkError(() => {
        return request(url, {
          redirect: 'follow',
          signal: controller.signal,
          ...opts
        })
      })
      if (controller.signal.aborted) {
        throw new DOMException('', 'AbortError')
      }
      if (!response.ok && response.status !== 304) {
        throw new HTTPStatusError(
          response.status,
          url,
          await response.text(),
          response.headers
        )
      }
      if (taskOpts.cache === 'write') {
        cached.push(url)
        cache.set(url, response.clone())
      }
      return response
    },
    async text(url, opts) {
      let response = await this.request(url, opts)

      let headerCharset = extractCharsetFromHeader(response.headers)
      let buffer = new Uint8Array(await response.arrayBuffer())
      let text = decodeWithProperEncoding(buffer, headerCharset)

      if (controller.signal.aborted) {
        throw new DOMException('', 'AbortError')
      }

      return createTextResponse(text, {
        headers: response.headers,
        redirected: response.redirected,
        status: response.status,
        url: response.url
      })
    }
  }
}

/**
 * Helper to put in `catch` block to ignore error on aborting download tasks.
 */
export function ignoreAbortError(error: unknown): void {
  if (!(error instanceof Error) || error.name !== 'AbortError') throw error
}
