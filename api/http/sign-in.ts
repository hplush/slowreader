import { createRequester, type Endpoint, hasStringKey } from './utils.ts'

export interface SignInRequest {
  password: string
  userId: string
}

export interface SignInResponse {
  session: string
}

const METHOD = 'POST'

export const signIn = createRequester<SignInRequest, SignInResponse>(
  METHOD,
  () => '/session'
)

export const signInEndpoint: Endpoint<SignInResponse, SignInRequest> = {
  checkBody(body) {
    if (hasStringKey(body, 'userId') && hasStringKey(body, 'password')) {
      return body
    }
    return false
  },
  method: METHOD,
  parseUrl(url) {
    if (url === '/session') {
      return {}
    } else {
      return false
    }
  }
}

export const SIGN_IN_ERRORS = {
  invalidCredentials: 'Invalid credentials'
}
