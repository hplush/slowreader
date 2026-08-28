import type { LoguxUndoError } from '@logux/client'
import { atom } from 'nanostores'

import { onEnvironment } from './environment.ts'
import { commonMessages } from './messages/index.ts'

/**
 * The app can not work until the user will fix the problem, so the fatal
 * page replaces the current route.
 */
export type Fatal =
  | { error: string | undefined; type: 'brokenDatabase' }
  | { type: 'notFound' }
  | { type: 'outdated' }

export const fatal = atom<Fatal | undefined>()

/**
 * Errors to render in client UI.
 *
 * Validation errors from server, failing server or network error.
 */
export class UserFacingError extends Error {
  constructor(text: string, opts?: ErrorOptions) {
    super(text, opts)
    this.name = 'UserFacingError'
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Syntax error during parsing XML/JSON document.
 */
export class ParseError extends Error {
  input: string | undefined
  constructor(message: string, input?: string) {
    super(message)
    this.name = 'ParseError'
    this.input = input
    Error.captureStackTrace(this, ParseError)
  }
}

/**
 * `fetch()` hides the reason in `cause`: it always has `fetch failed` message.
 * Take the deepest reason to have `ECONNREFUSED` or `ENOTFOUND` in the logs.
 */
function getReason(error: Error): string {
  let reason = error.message
  let cause = error.cause
  while (cause instanceof Error) {
    reason = cause.message
    cause = cause.cause
  }
  return reason
}

/**
 * fetch() was not able to make a network request.
 */
export class NetworkError extends Error {
  constructor(cause: Error) {
    super(getReason(cause), { cause })
    this.name = 'NetworkError'
    Error.captureStackTrace(this, NetworkError)
  }
}

export async function detectNetworkError<Result>(
  cb: () => Promise<Result>
): Promise<Awaited<Result>> {
  try {
    return await cb()
  } catch (e) {
    if (
      (e instanceof Error && e.name === 'TimeoutError') ||
      e instanceof TypeError
    ) {
      throw new NetworkError(e)
    } else {
      throw e
    }
  }
}

/**
 * Internal errors for non-200 HTTP response.
 */
export class HTTPStatusError extends Error {
  headers: Headers
  response: string
  status: number
  url: string
  constructor(status: number, url: string, response: string, headers: Headers) {
    super(`${status} ${url}`)
    this.status = status
    this.url = url
    this.response = response
    this.headers = headers
    this.name = 'HTTPStatusError'
    Error.captureStackTrace(this, HTTPStatusError)
  }
}

/**
 * When some object was not find to render 404 popup/page in UI.
 */
export class NotFoundError extends Error {
  constructor(options?: ErrorOptions) {
    super('Not found', options)
    this.name = 'NotFoundError'
    Error.captureStackTrace(this, NotFoundError)
  }
}

type PopularErrors = 400 | 401 | 403 | 404 | 451

export function errorToMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error)
  } else if (error instanceof HTTPStatusError) {
    if (
      error.response.length > 2 &&
      error.response.length < 100 &&
      !error.response.includes('<html')
    ) {
      return error.response.replace(/^\w/, letter => letter.toUpperCase())
    } else {
      let messages = commonMessages.get()
      if (error.status >= 500 && error.status <= 599) {
        return messages.error5xx
      } else {
        let key = `error${error.status as PopularErrors}` as const
        if (key in messages) {
          return messages[key]
        } else {
          return messages.errorOther({ status: error.status })
        }
      }
    }
  } else if (error instanceof ParseError) {
    return commonMessages.get().parseError
  } else if (error instanceof NetworkError) {
    return commonMessages.get().networkError
  } else {
    return error.message
  }
}

/* node:coverage disable */
export function isNotFoundError(
  error: unknown
): error is LoguxUndoError | NotFoundError {
  if (error instanceof Error) {
    return (
      error.name === 'NotFoundError' ||
      (error.name === 'LoguxUndoError' && error.message.includes('notFound'))
    )
  }
  return false
}
/* node:coverage enable */

onEnvironment(({ errorEvents }) => {
  errorEvents.addEventListener('unhandledrejection', event => {
    if (isNotFoundError(event.reason)) {
      fatal.set({ type: 'notFound' })
    }
  })
})
