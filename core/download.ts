import { warning } from './devtools.ts'
import { request } from './request.ts'

let cache = new Map<string, Response>()

export interface TextResponse {
  readonly contentType: string
  readonly headers: Headers
  parseJson(): unknown
  parseXml(): Document | null | XMLDocument
  readonly redirected: boolean
  readonly status: number
  readonly text: string
  readonly url: string
}

export interface DownloadTask {
  destroy(): void
  request: typeof request
  text(...args: Parameters<typeof request>): Promise<TextResponse>
}

function detectType(text: string): string | undefined {
  let lower = text.toLowerCase()
  let beginning = lower.slice(0, 100)
  if (/^\s*<!doctype html/i.test(beginning)) {
    return 'text/html'
  } else if (/^\s*<\?xml/i.test(beginning)) {
    return 'application/xml'
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

export function createTextResponse(
  text: string,
  other: Partial<Omit<TextResponse, 'ok' | 'text'>> = {}
): TextResponse {
  let status = other.status ?? 200
  let headers = other.headers ?? new Headers()
  let bodyCache: Document | undefined | XMLDocument

  let contentType =
    detectType(text) ?? headers.get('content-type') ?? 'text/plain'
  if (contentType.includes(';')) {
    contentType = contentType.split(';')[0]!
  }

  return {
    contentType,
    headers,
    parseJson() {
      if (
        contentType !== 'application/json' &&
        contentType !== 'application/feed+json'
      ) {
        return null
      }

      try {
        return JSON.parse(text) as unknown
      } catch (e) {
        if (e instanceof SyntaxError) {
          warning('Parse JSON error', e.message)
          return null
        } else {
          /* c8 ignore next 2 */
          throw e
        }
      }
    },
    parseXml() {
      if (!bodyCache) {
        if (contentType.includes('/json')) {
          return null
        }

        if (contentType.includes('+xml')) {
          contentType = 'application/xml'
        }
        if (
          contentType === 'text/html' ||
          contentType === 'application/xml' ||
          contentType === 'text/xml'
        ) {
          bodyCache = new DOMParser().parseFromString(text, contentType)
        } else {
          warning('Unknown content type', contentType)
          return null
        }
      }
      return bodyCache
    },
    redirected: other.redirected ?? false,
    status,
    text,
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

      let response = await request(url, {
        redirect: 'follow',
        signal: controller.signal,
        ...opts
      })
      if (controller.signal.aborted) {
        throw new DOMException('', 'AbortError')
      }
      if (!response.ok) {
        throw new Error(`${url}: ${response.status}`)
      }
      if (taskOpts.cache === 'write') {
        cached.push(url)
        cache.set(url, response.clone())
      }
      return response
    },
    async text(url, opts) {
      let response = await this.request(url, opts)
      let text = await response.text()
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

export function ignoreAbortError(error: unknown): void {
  if (!(error instanceof Error) || error.name !== 'AbortError') throw error
}
