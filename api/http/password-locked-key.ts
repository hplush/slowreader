import { IS_AUTH_KEY } from '../validators/auth.ts'
import { hasStringKey } from '../validators/utils.ts'
import { createRequester, type Endpoint, withSession } from './utils.ts'

export interface PasswordLockedKeyRequest {
  authKey: string
  session?: string
}

export interface PasswordLockedKeyResponse {
  lockedKey: string
}

const METHOD = 'POST'

export const passwordLockedKey = createRequester<
  PasswordLockedKeyRequest,
  PasswordLockedKeyResponse
>(METHOD, () => '/password/locked-key')

export const passwordLockedKeyEndpoint: Endpoint<
  PasswordLockedKeyResponse,
  PasswordLockedKeyRequest
> = {
  checkBody(body) {
    if (hasStringKey(body, 'authKey') && IS_AUTH_KEY.test(body.authKey)) {
      return withSession(body, { authKey: body.authKey })
    }
    return false
  },
  method: METHOD,
  parseUrl(url) {
    if (url === '/password/locked-key') {
      return {}
    } else {
      return false
    }
  }
}
