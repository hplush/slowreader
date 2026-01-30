import { equal } from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  generateCredentials,
  notEmpty,
  toSecret,
  validSecret,
  validServer,
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

  test('validates secret', () => {
    notValid(validSecret(''))
    notValid(validSecret(''))
    notValid(validSecret(''))
    notValid(validSecret('123456789 1234567890'))
    notValid(validSecret('1234567890 12345678901'))

    valid(validSecret('1234567890 ab3@5!7.-0'))
    valid(validSecret(toSecret(generateCredentials())))
  })

  test('validates server', () => {
    notValid(validServer('http://example.com'))
    notValid(validServer('user@example.com'))
    notValid(validServer('example com'))

    valid(validServer('example.com'))
    valid(validServer('example.com/path'))
    valid(validServer('example.com:31339'))
    valid(validServer('192.168.1.100:31339'))
  })
})
