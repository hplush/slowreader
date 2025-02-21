export function isObject(body: unknown): body is object {
  return typeof body === 'object' && body !== null
}

export function isEmptyObject(body: unknown): body is Record<never, never> {
  return isObject(body) && Object.keys(body).length === 0
}

export function hasKey<Key extends string>(
  body: unknown,
  key: Key
): body is Record<Key, unknown> {
  return isObject(body) && key in body
}

export function hasStringKey<Key extends string>(
  body: unknown,
  key: Key
): body is Record<Key, string> {
  return hasKey(body, key) && typeof body[key] === 'string'
}

export interface FetchOptions {
  fetch?: typeof fetch
  host?: string
  response?: (res: Response) => void
}

export async function fetchJSON<Response = unknown>(
  method: string,
  url: string,
  body: object,
  opts: FetchOptions | undefined = {}
): Promise<Response> {
  let host = opts.host ?? ''
  let request = opts.fetch ?? fetch
  let response = await request(host + url, {
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json'
    },
    method
  })
  if (!response.ok) {
    throw new Error(await response.text())
  }
  if (opts.response) opts.response(response)
  return response.json() as Response
}

export interface Endpoint<
  // Need to put it inside type to pass all types to server in a single variable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Response,
  Request,
  UrlParams extends Record<string, string> = Record<never, string>
> {
  checkBody(body: unknown, urlParams: UrlParams): false | Request
  method: string
  parseUrl(url: string): false | UrlParams
}
