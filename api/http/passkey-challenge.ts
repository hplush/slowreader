import { hasStringKey } from '../validators/utils.ts'
import { createRequester, type Endpoint, withSession } from './utils.ts'

const TYPES = ['add', 'reauth', 'signIn', 'signUp'] as const

export type ChallengeType = (typeof TYPES)[number]

function isChallengeType(value: string): value is ChallengeType {
  return TYPES.some(i => i === value)
}

export interface PasskeyChallengeRequest {
  session?: string
  type: ChallengeType
}

export interface PasskeyChallengeResponse {
  challenge: string
  credentials: {
    id: string
    transports: string[]
  }[]
  rpId: string
}

const METHOD = 'POST'

export const passkeyChallenge = createRequester<
  PasskeyChallengeRequest,
  PasskeyChallengeResponse
>(METHOD, () => '/passkeys/challenge')

export const passkeyChallengeEndpoint: Endpoint<
  PasskeyChallengeResponse,
  PasskeyChallengeRequest
> = {
  checkBody(body) {
    if (hasStringKey(body, 'type') && isChallengeType(body.type)) {
      return withSession(body, { type: body.type })
    }
    return false
  },
  method: METHOD,
  parseUrl(url) {
    if (url === '/passkeys/challenge') {
      return {}
    } else {
      return false
    }
  }
}
