import { equal, match } from 'node:assert/strict'
import { test } from 'node:test'

import { errorToMessage, HTTPStatusError, ParseError } from '../errors.ts'

test('converts non-Error to string', () => {
  equal(errorToMessage('simple string'), 'simple string')
})

test('converts ParseError to localized message', () => {
  match(errorToMessage(new ParseError('Invalid XML')), /Syntax error/)
})

test('converts HTTP error with short response', () => {
  let error = new HTTPStatusError(400, 'https://example.com', 'bad request')
  match(errorToMessage(error), /^Bad request$/)
})

test('ignores HTML response in HTTP error', () => {
  let error = new HTTPStatusError(
    404,
    'https://example.com',
    '<html><body>Can not found</body></html>'
  )
  match(errorToMessage(error), /^Not Found$/)
})

test('shows special message for known HTTP status codes', () => {
  match(
    errorToMessage(new HTTPStatusError(500, 'https://example.com', '')),
    /not working/
  )
  match(
    errorToMessage(new HTTPStatusError(502, 'https://example.com', '')),
    /not working/
  )

  match(
    errorToMessage(new HTTPStatusError(400, 'https://example.com', '')),
    /^Bad request$/
  )
  match(
    errorToMessage(new HTTPStatusError(401, 'https://example.com', '')),
    /^Unauthorized$/
  )
  match(
    errorToMessage(new HTTPStatusError(403, 'https://example.com', '')),
    /^Forbidden$/
  )
  match(
    errorToMessage(new HTTPStatusError(404, 'https://example.com', '')),
    /^Not Found$/
  )
  match(
    errorToMessage(new HTTPStatusError(451, 'https://example.com', '')),
    /blocked/
  )
})

test('shows code for rare HTTP status code', () => {
  let error = new HTTPStatusError(418, 'https://example.com', '')
  equal(errorToMessage(error), 'Feed server error: 418')
})

test('converts generic Error with NetworkError in message', () => {
  let error = new Error('NetworkError when attempting to fetch resource')
  equal(
    errorToMessage(error),
    'Network error when attempting to fetch resource'
  )
})
