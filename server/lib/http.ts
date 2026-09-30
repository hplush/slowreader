import type { BaseServer } from '@logux/server'
import { COMMON_ERRORS, type Endpoint } from '@slowreader/api'
import type { IncomingMessage, ServerResponse } from 'node:http'

import { config } from './config.ts'

function badRequest(res: ServerResponse, msg: string, status = 400): true {
  res.writeHead(status, { 'Content-Type': 'text/plain' })
  res.end(msg)
  return true
}

const MAX_BODY = 64 * 1024

function collectBody(req: IncomingMessage): Promise<false | string> {
  return new Promise(resolve => {
    let data = ''
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY) {
        req.removeAllListeners('data')
        req.resume()
        resolve(false)
      } else {
        data += String(chunk)
      }
    })
    req.on('end', () => {
      resolve(data)
    })
  })
}

export class ErrorResponse {
  message: string
  status: number

  constructor(message: string, status = 400) {
    this.message = message
    this.status = status
  }
}

export function tooManyRequests(): ErrorResponse {
  return new ErrorResponse(COMMON_ERRORS.TOO_MANY_REQUESTS, 429)
}

function allowCors(res: ServerResponse, origin: string): void {
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader(
    'Access-Control-Allow-Methods',
    'OPTIONS, POST, GET, PUT, DELETE'
  )
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Subprotocol')
}

const LOCALHOST = /^http:\/\/localhost:\d+$/

export function jsonApi<Response, Request extends object>(
  server: BaseServer,
  endpoint: Endpoint<Response, Request, Record<string, string>>,
  listener: (
    params: Request,
    res: ServerResponse,
    req: IncomingMessage
  ) =>
    | ErrorResponse
    | false
    | Promise<ErrorResponse>
    | Promise<false>
    | Promise<Response>
    | Response
): void {
  server.http(async (req, res) => {
    if (req.headers.origin) {
      if (
        (config.env === 'development' && LOCALHOST.test(req.headers.origin)) ||
        req.headers.origin === config.webOrigin
      ) {
        allowCors(res, req.headers.origin)
      }
    }

    if (req.headers['x-subprotocol'] && server.options.minSubprotocol) {
      let clientSubprotocol = Number(req.headers['x-subprotocol'])

      if (
        isNaN(clientSubprotocol) ||
        clientSubprotocol < server.options.minSubprotocol
      ) {
        return badRequest(res, COMMON_ERRORS.OUTDATED_CLIENT)
      }
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(200)
      res.end()
      return true
    }

    if (req.method === endpoint.method) {
      let url = new URL(req.url!, 'http://localhost')
      let urlParams = endpoint.parseUrl(url.pathname)
      if (urlParams) {
        if (req.headers['content-type'] !== 'application/json') {
          return badRequest(res, 'Wrong content type')
        }
        let data = await collectBody(req)
        if (data === false) {
          return badRequest(res, 'Request is too big', 413)
        }
        let body: unknown
        try {
          body = JSON.parse(data)
        } catch {
          return badRequest(res, 'Invalid JSON')
        }
        let validated = endpoint.checkBody(body, urlParams)
        if (!validated) {
          return badRequest(res, 'Invalid body')
        }
        let answer = await listener(validated, res, req)
        if (answer === false) {
          return badRequest(res, 'Invalid request')
        } else if (answer instanceof ErrorResponse) {
          return badRequest(res, answer.message, answer.status)
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(answer))

        return true
      }
    }
    return false
  })
}
