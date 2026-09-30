import type { Proof } from '../types/auth.ts'
import { IS_AUTH_KEY, IS_LOCKED_KEY } from '../validators/auth.ts'
import { hasKey, hasStringKey } from '../validators/utils.ts'
import { isProof } from '../validators/webauthn.ts'
import { createRequester, type Endpoint, withSession } from './utils.ts'

export interface NewPasswordRequest {
  authKey: string
  lockedKey: string
  proof: Proof
  session?: string
}

export interface NewPasswordResponse {
  session: string
}

const METHOD = 'POST'

export const newPassword = createRequester<
  NewPasswordRequest,
  NewPasswordResponse
>(METHOD, () => '/password')

export const newPasswordEndpoint: Endpoint<
  NewPasswordResponse,
  NewPasswordRequest
> = {
  checkBody(body) {
    if (
      hasStringKey(body, 'authKey') &&
      hasStringKey(body, 'lockedKey') &&
      IS_AUTH_KEY.test(body.authKey) &&
      IS_LOCKED_KEY.test(body.lockedKey) &&
      hasKey(body, 'proof') &&
      isProof(body.proof)
    ) {
      return withSession(body, {
        authKey: body.authKey,
        lockedKey: body.lockedKey,
        proof: body.proof
      })
    }
    return false
  },
  method: METHOD,
  parseUrl(url) {
    if (url === '/password') {
      return {}
    } else {
      return false
    }
  }
}

export const REAUTH_ERRORS = {
  wrongProof: 'Wrong proof'
}
