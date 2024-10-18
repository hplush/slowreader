import {
  type Endpoint,
  fetchJSON,
  type FetchOptions,
  hasStringKey,
  isEmptyObject
} from './utils.ts'

export type SignOutRequest = {
  session?: string
}

export type SignOutResponse = Record<string, never>

const METHOD = 'DELETE'

export async function signOut(
  params: SignOutRequest,
  opts?: FetchOptions
): Promise<SignOutResponse> {
  return fetchJSON(METHOD, '/session', params, opts)
}

export const signOutEndpoint: Endpoint<SignOutResponse, SignOutRequest> = {
  checkBody(body) {
    if (isEmptyObject(body) || hasStringKey(body, 'session')) {
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
