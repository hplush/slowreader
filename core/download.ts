import { request } from './request.js'

export interface TextResponse {
  readonly headers: Headers
  readonly ok: boolean
  parse(): Document | XMLDocument
  parseJson(): null | object
  readonly status: number
  readonly text: string
  readonly url: string
}

export interface DownloadTask {
  abortAll(): void
  request: typeof request
  text(...args: Parameters<typeof request>): Promise<TextResponse>
}

function getContentMediaType(headers: Headers): string {
  let contentType = headers.get('content-type') ?? 'text/html'
  if (contentType.includes(';')) {
    contentType = contentType.split(';')[0]!
  }
  return contentType
}

export function createTextResponse(
  text: string,
  other: Partial<Omit<TextResponse, 'ok' | 'text'>> = {}
): TextResponse {
  let status = other.status ?? 200
  let headers = other.headers ?? new Headers()
  let bodyCache: Document | undefined | XMLDocument
  return {
    headers,
    ok: status >= 200 && status < 300,
    parse() {
      if (!bodyCache) {
        let parseType = getContentMediaType(headers)

        if (parseType.includes('+xml')) {
          parseType = 'application/xml'
        }
        if (
          parseType === 'text/html' ||
          parseType === 'application/xml' ||
          parseType === 'text/xml'
        ) {
          bodyCache = new DOMParser().parseFromString(text, parseType)
        } else {
          // eslint-disable-next-line no-console
          console.error('Unknown content type', parseType)
          return new DOMParser().parseFromString(
            'Unknown content type',
            'text/html'
          )
        }
      }
      return bodyCache
    },
    parseJson() {
      let parseType = getContentMediaType(headers)

      if (
        parseType !== 'application/json' &&
        parseType !== 'application/feed+json'
      ) {
        return null
      }

      try {
        return JSON.parse(text)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Parse JSON error', e)
        return null
      }
    },
    status,
    text,
    url: other.url ?? 'https://example.com'
  }
}

export function createDownloadTask(): DownloadTask {
  let controller = new AbortController()
  return {
    abortAll() {
      controller.abort()
    },
    request(url, opts = {}) {
      return request(url, {
        redirect: 'follow',
        signal: controller.signal,
        ...opts
      })
    },
    async text(url, opts) {
      let response = await this.request(url, opts)
      let text = await response.text()
      if (controller.signal.aborted) {
        throw new DOMException('', 'AbortError')
      }
      return createTextResponse(text, {
        headers: response.headers,
        status: response.status,
        url: response.url
      })
    }
  }
}

export function ignoreAbortError(error: unknown): void {
  if (!(error instanceof Error) || error.name !== 'AbortError') throw error
}
