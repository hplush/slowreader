import { SUBPROTOCOL } from '../index.ts'
import { hasStringKey } from '../validators/utils.ts'

export function withSession<Request extends object>(
  body: object,
  request: Request
): Request & { session?: string } {
  if (hasStringKey(body, 'session')) {
    return { ...request, session: body.session }
  }
  return request
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
      'Content-Type': 'application/json',
      'X-Subprotocol': String(SUBPROTOCOL)
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
  _Response,
  Request,
  UrlParams extends Record<string, string> = Record<string, never>
> {
  checkBody(body: unknown, urlParams: UrlParams): false | Request
  method: string
  parseUrl(url: string): false | UrlParams
}
