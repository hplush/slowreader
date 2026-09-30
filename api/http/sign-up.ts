import { IS_AUTH_KEY, IS_LOCKED_KEY, IS_USER_ID } from '../validators/auth.ts'
import { hasKey, hasStringKey } from '../validators/utils.ts'
import {
  isRegistrationResponse,
  type RegistrationResponse
} from '../validators/webauthn.ts'
import { createRequester, type Endpoint } from './utils.ts'

export interface SignUpPasskey {
  lockedKey: string
  response: RegistrationResponse
}

export interface SignUpPassword {
  authKey: string
  lockedKey: string
}

/**
 * Account with a synced passkey can be created without a password.
 */
export type SignUpRequest =
  | { passkey: SignUpPasskey; userId: string }
  | { passkey?: SignUpPasskey; password: SignUpPassword; userId: string }

export interface SignUpResponse {
  passkey?: {
    provider: null | string
    synced: boolean
  }
  session: string
  userId: string
}

const METHOD = 'PUT'

export const signUp = createRequester<SignUpRequest, SignUpResponse>(
  METHOD,
  ({ userId }) => `/users/${userId}`
)

const URL_PATTERN = /^\/users\/([^/]+)$/

function checkPasskey(body: object): false | SignUpPasskey | undefined {
  if (!hasKey(body, 'passkey')) return undefined
  let passkey = body.passkey
  if (
    hasStringKey(passkey, 'lockedKey') &&
    IS_LOCKED_KEY.test(passkey.lockedKey) &&
    hasKey(passkey, 'response') &&
    isRegistrationResponse(passkey.response)
  ) {
    return { lockedKey: passkey.lockedKey, response: passkey.response }
  }
  return false
}

export const signUpEndpoint: Endpoint<
  SignUpResponse,
  SignUpRequest,
  { userId: string }
> = {
  checkBody(body, urlParams) {
    if (
      !hasStringKey(body, 'userId') ||
      body.userId !== urlParams.userId ||
      !IS_USER_ID.test(body.userId)
    ) {
      return false
    }
    let passkey = checkPasskey(body)
    if (passkey === false) return false
    if (!hasKey(body, 'password')) {
      return passkey ? { passkey, userId: body.userId } : false
    }
    let password = body.password
    if (
      hasStringKey(password, 'authKey') &&
      hasStringKey(password, 'lockedKey') &&
      IS_AUTH_KEY.test(password.authKey) &&
      IS_LOCKED_KEY.test(password.lockedKey)
    ) {
      let request: SignUpRequest = {
        password: { authKey: password.authKey, lockedKey: password.lockedKey },
        userId: body.userId
      }
      if (passkey) request.passkey = passkey
      return request
    }
    return false
  },
  method: METHOD,
  parseUrl(url) {
    let match = url.match(URL_PATTERN)
    if (match) {
      return { userId: match[1]! }
    } else {
      return false
    }
  }
}

export const SIGN_UP_ERRORS = {
  invalidPasskey: 'Invalid passkey',
  userIdTaken: 'User ID was already taken'
}
