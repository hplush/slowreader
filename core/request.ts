import { delay } from 'nanodelay'

export interface RequestMethod {
  (url: string, opts?: RequestInit): Promise<Response>
}

export let request: RequestMethod

export function setRequestMethod(method: RequestMethod): void {
  request = method
}

export interface RequestWaiter {
  (status: number, body?: string, contentType?: string): Promise<void>
  aborted?: true
}

export interface RequestMock {
  andRespond(status: number, body?: string, contentType?: string): void
  andWait(): RequestWaiter
}

interface RequestExpect {
  contentType: string
  response: string
  status: number
  url: string
  wait: Promise<void>
  waiter: RequestWaiter | undefined
}

let requestExpects: RequestExpect[] = []

export class MockRequestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MockRequestError'
    Error.captureStackTrace(this, MockRequestError)
  }
}

/* c8 ignore start */
let fetchMock: RequestMethod = async (url, opts = {}) => {
  let expect = requestExpects.shift()
  if (!expect) {
    throw new MockRequestError(
      `Unexpected request ${url} ${JSON.stringify(opts)}`
    )
  } else if (expect.url !== url) {
    throw new MockRequestError(
      `Expected request ${expect.url} instead of ${url}`
    )
  } else {
    let { promise, reject } = Promise.withResolvers()
    function abortCallback(): void {
      if (expect?.waiter) expect.waiter.aborted = true
      reject(new DOMException('', 'AbortError'))
    }

    opts.signal?.addEventListener('abort', abortCallback)
    await Promise.race([expect.wait, promise])
    opts.signal?.removeEventListener('abort', abortCallback)

    let response = new Response(expect.response, {
      headers: { 'Content-Type': expect.contentType },
      status: expect.status
    })
    Object.defineProperty(response, 'url', { value: url })
    return response
  }
}

export function mockRequest(): void {
  requestExpects = []
  setRequestMethod(fetchMock)
}

export function expectRequest(url: string): RequestMock {
  let expect: RequestExpect = {
    contentType: 'text/html',
    response: '',
    status: 200,
    url,
    wait: Promise.resolve(),
    waiter: undefined
  }
  requestExpects.push(expect)
  return {
    andRespond(status, body = '', contentType = 'text/html') {
      expect.contentType = contentType
      expect.status = status
      expect.response = body
    },
    andWait() {
      let { promise, resolve } = Promise.withResolvers<void>()
      expect.wait = promise
      expect.waiter = (status, body = '', contentType = 'text/html') => {
        expect.contentType = contentType
        expect.status = status
        expect.response = body
        resolve()
        return delay(10)
      }
      return expect.waiter
    }
  }
}

export function checkAndRemoveRequestMock(): void {
  if (requestExpects.length > 0) {
    throw new Error(
      'Test didn’t send requests: ' + requestExpects.map(i => i.url).join(', ')
    )
  }
  setRequestMethod(fetch)
}
/* c8 ignore stop */
