import { getEnvironment } from '../environment.ts'
import { detectNetworkError, HTTPStatusError, ParseError } from '../errors.ts'
import { isObject } from '../loader/common.ts'
import { request } from '../request.ts'
import { toBase64 } from './keys.ts'

export function randomToken(): string {
  return toBase64(crypto.getRandomValues(new Uint8Array(32)))
}

export async function sha256(text: string): Promise<string> {
  let hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text)
  )
  return toBase64(new Uint8Array(hash))
}

/**
 * PKCE proves that the same client started and finished OAuth sign in.
 * Loader keeps `verifier` in the sign in data and sends `challenge`
 * with `state` to the service.
 */
export async function createPkce(): Promise<{
  challenge: string
  redirect: string
  state: string
  verifier: string
}> {
  let verifier = randomToken()
  return {
    challenge: await sha256(verifier),
    redirect: getEnvironment().oauthRedirect,
    state: randomToken(),
    verifier
  }
}

export async function parseJson(
  response: Response
): Promise<Record<string, unknown>> {
  let text = await response.text()
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new ParseError(`${response.url} is not JSON`, text)
  }
  if (!isObject(json)) throw new ParseError(`${response.url} is not object`)
  return json
}

export async function requestJson(
  url: string,
  opts: RequestInit = {}
): Promise<Record<string, unknown>> {
  let response = await detectNetworkError(() => request(url, opts, true))
  if (!response.ok) {
    throw new HTTPStatusError(
      response.status,
      url,
      await response.text(),
      response.headers
    )
  }
  return parseJson(response)
}

export function readString(json: Record<string, unknown>, key: string): string {
  let value = json[key]
  if (typeof value !== 'string') throw new ParseError(`No ${key} in response`)
  return value
}
