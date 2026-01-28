import type { BaseServer } from '@logux/server'
import type { Endpoint } from '@slowreader/api'
import type { IncomingMessage, ServerResponse } from 'node:http'

import { config } from './config.ts'

function badRequest(res: ServerResponse, msg: string): true {
  res.writeHead(400, { 'Content-Type': 'text/plain' })
  res.end(msg)
  return true
}

function collectBody(req: IncomingMessage): Promise<string> {
  return new Promise(resolve => {
    let data = ''
    req.on('data', chunk => {
      data += String(chunk)
    })
    req.on('end', () => {
      resolve(data)
    })
  })
}

export class ErrorResponse {
  message: string

  constructor(message: string) {
    this.message = message
  }
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

const LOCALHOST = /:\/\/localhost:/
const PRODUCTION = /(:\/\/|\.)slowreader\.app$/

export function jsonApi<Response, Request extends object>(
  server: BaseServer,
  endpoint: Endpoint<Response, Request>,
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
        PRODUCTION.test(req.headers.origin)
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
        res.writeHead(400, {
          'Access-Control-Expose-Headers': 'X-Client-Action',
          'Content-Type': 'text/plain',
          'X-Client-Action': 'update-client'
        })
        res.end('Old client. Please update.')
        return true
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
          return badRequest(res, answer.message)
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(answer))

        return true
      }
    }
    return false
  })
}
