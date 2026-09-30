import { IS_AUTH_KEY, IS_USER_ID } from '../validators/auth.ts'
import { hasKey, hasStringKey } from '../validators/utils.ts'
import {
  type AuthenticationResponse,
  isAuthenticationResponse
} from '../validators/webauthn.ts'
import { createRequester, type Endpoint } from './utils.ts'

export type SignInRequest =
  | { passkey: AuthenticationResponse }
  | { password: { authKey: string }; userId: string }

export interface SignInResponse {
  hasPassword: boolean
  /**
   * Data key locked by the password or by the passkey from the request.
   */
  lockedKey: string
  session: string
  userId: string
}

const METHOD = 'POST'

export const signIn = createRequester<SignInRequest, SignInResponse>(
  METHOD,
  () => '/sessions'
)

export const signInEndpoint: Endpoint<SignInResponse, SignInRequest> = {
  checkBody(body) {
    if (hasKey(body, 'passkey')) {
      return isAuthenticationResponse(body.passkey)
        ? { passkey: body.passkey }
        : false
    }
    if (
      hasStringKey(body, 'userId') &&
      IS_USER_ID.test(body.userId) &&
      hasKey(body, 'password') &&
      hasStringKey(body.password, 'authKey') &&
      IS_AUTH_KEY.test(body.password.authKey)
    ) {
      return {
        password: { authKey: body.password.authKey },
        userId: body.userId
      }
    }
    return false
  },
  method: METHOD,
  parseUrl(url) {
    if (url === '/sessions') {
      return {}
    } else {
      return false
    }
  }
}

export const SIGN_IN_ERRORS = {
  invalidCredentials: 'Invalid credentials',
  unknownPasskey: 'Unknown passkey'
}
