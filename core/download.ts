import { warning } from './devtools.ts'
import { request } from './request.ts'

export interface TextResponse {
  readonly contentType: string
  readonly headers: Headers
  readonly ok: boolean
  parseJson(): null | unknown
  parseXml(): Document | null | XMLDocument
  readonly redirected: boolean
  readonly status: number
  readonly text: string
  readonly url: string
}

export interface DownloadTask {
  abortAll(): void
  request: typeof request
  text(...args: Parameters<typeof request>): Promise<TextResponse>
}

export enum EncodeType {
  EUC_JP = 'euc-jp',
  ISO_2022_JP = 'iso-2022-jp',
  ISO_8859_1 = 'iso-8859-1',
  SHIFT_JIS = 'shift-jis',
  UTF8 = 'utf-8',
  WINDOWS_1251 = 'windows-1251',
  WINDOWS_1252 = 'windows-1252',
  WINDOWS_1253 = 'windows-1253',
  WINDOWS_31J = 'Windows-31J'
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

function detectEncodeType(response: Partial<Response>): string {
  let headers = response.headers ?? new Headers()
  let contentType = headers.get('content-type') ?? ''
  if (contentType.includes(EncodeType.UTF8)) {
    return EncodeType.UTF8
  } else if (contentType.includes(EncodeType.EUC_JP)) {
    return EncodeType.EUC_JP
  } else if (contentType.includes(EncodeType.ISO_2022_JP)) {
    return EncodeType.ISO_2022_JP
  } else if (contentType.includes(EncodeType.SHIFT_JIS)) {
    return EncodeType.SHIFT_JIS
  } else if (contentType.includes(EncodeType.WINDOWS_1251)) {
    return EncodeType.WINDOWS_1251
  } else if (contentType.includes(EncodeType.WINDOWS_1252)) {
    return EncodeType.WINDOWS_1252
  } else if (contentType.includes(EncodeType.WINDOWS_1253)) {
    return EncodeType.WINDOWS_1253
  } else if (contentType.includes(EncodeType.WINDOWS_31J)) {
    return EncodeType.WINDOWS_31J
  }

  return EncodeType.UTF8;
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
    ok: status >= 200 && status < 300,
    parseJson() {
      if (
        contentType !== 'application/json' &&
        contentType !== 'application/feed+json'
      ) {
        return null
      }

      try {
        return JSON.parse(text)
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
      let text: string
      let encodeType = detectEncodeType(response)
      if (encodeType !== EncodeType.UTF8) {
        let buffer = await response.arrayBuffer()
        let decoder = new TextDecoder(encodeType);
        text = decoder.decode(buffer);
      } else {
        text = await response.text()
      }

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
