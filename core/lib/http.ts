import type { Requester } from '@slowreader/api'

import { getEnvironment } from '../environment.ts'
import { commonMessages as t } from '../messages/index.ts'

/**
 * Errors to render in client UI.
 *
 * Validation errors from server, failing server or network error.
 */
export class UserFacingError extends Error {
  constructor(text: string) {
    super(text)
    this.name = 'UserFacingError'
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Internal errors for non-200 HTTP response.
 */
export class HTTPStatusError extends Error {
  /* node:coverage ignore next 3 */
  response: string
  status: number
  url: string
  constructor(status: number, url: string, response: string) {
    super(`${status} ${url}: ${response}`)
    this.status = status
    this.url = url
    this.response = response
    this.name = 'HTTPStatusError'
    Error.captureStackTrace(this, HTTPStatusError)
  }
}

/**
 * Takes fetch() wrapper from `@slowreader/api/http` and do the request
 * using test’s mock if necessary and checking for network/server errors
 * to simplify page’s code.
 */
export async function checkErrors<Params extends object, ResponseJSON>(
  requester: Requester<Params, ResponseJSON>,
  params: Params,
  host: string
): Promise<ResponseJSON> {
  let response: Awaited<ReturnType<typeof requester>>
  let server = getEnvironment().server
  let fetch = typeof server === 'string' ? undefined : server.fetch
  try {
    response = await requester(params, { fetch, host })
  } catch (e) {
    if (e instanceof Error) getEnvironment().warn(e)
    throw new UserFacingError(t.get().networkError)
  }
  if (!response.ok) {
    let text = await response.text()
    if (response.status === 400 && text !== 'Invalid request') {
      throw new UserFacingError(text)
    } else {
      getEnvironment().warn(
        new HTTPStatusError(response.status, response.url, text)
      )
      throw new UserFacingError(t.get().internalError)
    }
  }
  return response.json()
}
