import { request } from '../request/index.js'

export interface TextResponse {
  readonly headers: Headers
  readonly ok: boolean
  readonly status: number
  readonly text: string
  readonly url: string
}

export interface DownloadTask {
  abortAll(): void
  request: typeof request
  text(...args: Parameters<typeof request>): Promise<TextResponse>
}

export function createTextResponse(
  text: string,
  other: Partial<Omit<TextResponse, 'ok' | 'text'>>
): TextResponse {
  let status = other.status ?? 200
  return {
    headers: other.headers ?? new Headers(),
    ok: status >= 200 && status < 300,
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
