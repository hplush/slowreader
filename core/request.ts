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

let fetchMock: RequestMethod = async (url, opts = {}) => {
  let expect = requestExpects.shift()
  if (!expect) {
    throw new Error(`Unexpected request ${url} ${JSON.stringify(opts)}`)
  } else if (expect.url !== url) {
    throw new Error(`Expected request ${expect.url} instead of ${url}`)
  } else {
    let throwError: (e: Error) => void
    let waitForError = new Promise((resolve, reject) => {
      throwError = reject
    })
    function abortCallback(): void {
      if (expect?.waiter) expect.waiter.aborted = true
      throwError(new DOMException('', 'AbortError'))
    }

    opts.signal?.addEventListener('abort', abortCallback)
    await Promise.race([expect.wait, waitForError])
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
      let resolveWait: () => void
      expect.wait = new Promise(resolve => {
        resolveWait = resolve
      })
      expect.waiter = (status, body = '', contentType = 'text/html') => {
        expect.contentType = contentType
        expect.status = status
        expect.response = body
        resolveWait()
        return new Promise(resolve => {
          setTimeout(resolve, 10)
        })
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
