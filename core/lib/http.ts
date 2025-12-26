import type { Requester } from '@slowreader/api'

import { getEnvironment } from '../environment.ts'
import {
  detectNetworkError,
  HTTPStatusError,
  UserFacingError
} from '../errors.ts'

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
    response = await detectNetworkError(() => {
      return requester(params, { fetch, host })
    })
  } catch (e) {
    getEnvironment().warn(e)
    throw e
  }
  if (!response.ok) {
    let text = await response.text()
    if (response.status === 400 && text !== 'Invalid request') {
      throw new UserFacingError(text)
    } else {
      throw new HTTPStatusError(
        response.status,
        response.url,
        text,
        response.headers
      )
    }
  }
  return response.json()
}
