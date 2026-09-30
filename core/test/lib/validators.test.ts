import { equal } from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  generateCredentials,
  notEmpty,
  validPassword,
  validUrl,
  validUserId
} from '../../index.ts'

describe('validators', () => {
  function notValid(value: string | undefined): void {
    equal(typeof value, 'string')
  }

  function valid(value: string | undefined): void {
    equal(typeof value, 'undefined')
  }

  test('validates required string', () => {
    notValid(notEmpty(''))
    notValid(notEmpty('  '))

    valid(notEmpty('value'))
  })

  test('validates URL', () => {
    notValid(validUrl('example.com'))
    notValid(validUrl('not URL'))

    valid(validUrl('http://example.com'))
  })

  test('validates user ID', () => {
    notValid(validUserId('user@example.com'))
    notValid(validUserId('123456789012345'))
    notValid(validUserId('12345678901234567'))

    valid(validUserId('1234567890123456'))
    valid(validUserId(generateCredentials().userId))
  })

  test('validates password', () => {
    notValid(validPassword(''))
    notValid(validPassword('1234567890 ab3@5!7.-0'))
    notValid(validPassword('a'.repeat(65)))
    notValid(validPassword('a'.repeat(65) + '0'))
    notValid(validPassword('a'.repeat(65) + 'l'))

    valid(validPassword('a'.repeat(66)))
    valid(validPassword(generateCredentials().password))
  })
})
