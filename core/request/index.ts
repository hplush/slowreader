export type RequestMethod = typeof fetch

let currentMethod: RequestMethod

export function setRequestMethod(method: RequestMethod): void {
  currentMethod = method
}

export const request: RequestMethod = (...args) => {
  return currentMethod(...args)
}

export interface RequestMock {
  andRespond(status: number, body?: string): void
  andWait(): (status: number, body?: string) => void
}

interface RequestExpect {
  response: string
  status: number
  url: string
  wait: Promise<void>
}

let requestExpects: RequestExpect[] = []

let fetchMock: RequestMethod = async (url, opts = {}) => {
  let nextExpect = requestExpects.shift()
  if (!nextExpect) {
    throw new Error(`Unexpected request ${url} ${JSON.stringify(opts)}`)
  } else if (nextExpect.url !== url) {
    throw new Error(`Expected request ${nextExpect.url} instead of ${url}`)
  } else {
    let throwError: (e: Error) => void
    let waitForError = new Promise((resolve, reject) => {
      throwError = reject
    })
    function abortCallback(): void {
      throwError(new DOMException('', 'AbortError'))
    }

    opts.signal?.addEventListener('abort', abortCallback)
    await Promise.race([nextExpect.wait, waitForError])
    opts.signal?.removeEventListener('abort', abortCallback)

    return new Response(nextExpect.response, { status: nextExpect.status })
  }
}

export function mockRequest(): void {
  requestExpects = []
  setRequestMethod(fetchMock)
}

export function expectRequest(url: string): RequestMock {
  let expect: RequestExpect = {
    response: '',
    status: 200,
    url,
    wait: Promise.resolve()
  }
  requestExpects.push(expect)
  return {
    andRespond(status, body = '') {
      expect.status = status
      expect.response = body
    },
    andWait() {
      let resolveWait: Function
      expect.wait = new Promise(resolve => {
        resolveWait = resolve
      })
      return (status, body = '') => {
        expect.status = status
        expect.response = body
        resolveWait()
      }
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
