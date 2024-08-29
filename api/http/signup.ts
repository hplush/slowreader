import {
  type Endpoint,
  fetchJSON,
  type FetchOptions,
  hasStringKey
} from './utils.ts'

export interface SignUpRequest {
  id: string
  password: string
}

export interface SignUpResponse {
  id: string
  session: string
}

const METHOD = 'PUT'

export async function signUp(
  params: SignUpRequest,
  opts?: FetchOptions
): Promise<SignUpResponse> {
  return fetchJSON(METHOD, `/users/${params.id}`, params, opts)
}

const URL_PATTERN = /^\/users\/([^/]+)$/

export const signUpEndpoint: Endpoint<
  SignUpResponse,
  SignUpRequest,
  { id: string }
> = {
  checkBody(body, urlParams) {
    if (hasStringKey(body, 'id') && hasStringKey(body, 'password')) {
      if (body.id === urlParams.id) {
        return body
      }
    }
    return false
  },
  method: METHOD,
  parseUrl(url) {
    let match = url.match(URL_PATTERN)
    if (match) {
      return { id: match[1]! }
    } else {
      return false
    }
  }
}
