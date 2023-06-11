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
  other: Partial<TextResponse>
): TextResponse {
  return {
    headers: new Headers(),
    ok: true,
    status: 200,
    url: 'https://example.com',
    ...other,
    text
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
      return {
        headers: response.headers,
        ok: response.ok,
        status: response.status,
        text,
        url: response.url
      }
    }
  }
}
