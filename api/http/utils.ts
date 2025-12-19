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

export interface RequesterOptions {
  fetch?: typeof fetch
  host?: string
  response?: (res: Response) => void
}

export type HTTPResponse<ResponseJSON> = (
  | {
      json(): never
      ok: false
    }
  | {
      json(): Promise<ResponseJSON>
      ok: true
    }
) &
  Response

export interface Requester<Params extends object, ResponseJSON> {
  (params: Params, opts?: RequesterOptions): Promise<HTTPResponse<ResponseJSON>>
}

export async function fetchJSON<ResponseJSON = unknown>(
  method: string,
  url: string,
  body: object,
  opts: RequesterOptions | undefined = {}
): Promise<HTTPResponse<ResponseJSON>> {
  let host = opts.host ?? ''
  let request = opts.fetch ?? fetch
  let response = await request(host + url, {
    body: JSON.stringify(body),
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    method
  })
  if (opts.response) opts.response(response)
  return response as HTTPResponse<ResponseJSON>
}

export function createRequester<Params extends object, ResponseJSON>(
  method: string,
  getUrl: (params: Params) => string
): Requester<Params, ResponseJSON> {
  return (params, opts) => {
    return fetchJSON<ResponseJSON>(method, getUrl(params), params, opts)
  }
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
