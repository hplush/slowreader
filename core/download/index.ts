import { request } from '../request/index.js'

export interface DownloadTask {
  abortAll(): void
  request: typeof request
}

export function createDownloadTask(): DownloadTask {
  let controller = new AbortController()
  return {
    abortAll() {
      controller.abort()
    },
    request(url, opts = {}) {
      return request(url, {
        signal: controller.signal,
        ...opts
      })
    }
  }
}
