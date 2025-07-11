import type { Requester } from '@slowreader/api'

import { getEnvironment } from '../environment.ts'
import { commonMessages as t } from '../messages/index.ts'

export class HTTPRequestError extends Error {
  constructor(text: string) {
    super(text)
    this.name = 'HTTPRequestError'
    Error.captureStackTrace(this, this.constructor)
  }

  static is(error: unknown): error is HTTPRequestError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'HTTPRequestError'
    )
  }
}

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
    throw new HTTPRequestError(t.get().networkError)
  }
  if (!response.ok) {
    let text = await response.text()
    if (response.status === 400 && text !== 'Invalid request') {
      throw new HTTPRequestError(text)
    } else {
      getEnvironment().warn(new Error(`Response ${response.status}: ${text}`))
      throw new HTTPRequestError(t.get().internalError)
    }
  }
  return response.json()
}
