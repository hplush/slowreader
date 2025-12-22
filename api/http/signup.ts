import { createRequester, type Endpoint, hasStringKey } from './utils.ts'

export interface SignUpRequest {
  password: string
  userId: string
}

export interface SignUpResponse {
  session: string
  userId: string
}

const METHOD = 'PUT'

export const signUp = createRequester<SignUpRequest, SignUpResponse>(
  METHOD,
  ({ userId }) => `/users/${userId}`
)

const URL_PATTERN = /^\/users\/([^/]+)$/

export const signUpEndpoint: Endpoint<
  SignUpResponse,
  SignUpRequest,
  { userId: string }
> = {
  checkBody(body, urlParams) {
    if (hasStringKey(body, 'userId') && hasStringKey(body, 'password')) {
      if (body.userId === urlParams.userId) {
        return body
      }
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
  userIdTaken: 'User ID was already taken'
}
