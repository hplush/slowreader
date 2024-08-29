import {
  type Endpoint,
  fetchJSON,
  type FetchOptions,
  hasStringKey
} from './utils.ts'

export interface SignInRequest {
  password: string
  userId: string
}

export interface SignInResponse {
  session: string
}

const METHOD = 'POST'

export async function signIn(
  params: SignInRequest,
  opts?: FetchOptions
): Promise<SignInResponse> {
  return fetchJSON(METHOD, '/session', params, opts)
}

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
