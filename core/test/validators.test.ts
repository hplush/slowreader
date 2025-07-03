import { equal } from 'node:assert'
import { test } from 'node:test'

import {
  notEmpty,
  validSecret,
  validServer,
  validUrl,
  validUserId
} from '../index.ts'

function notValid(value: string | undefined): void {
  equal(typeof value, 'string')
}

function valid(value: string | undefined): void {
  equal(typeof value, 'undefined')
}

test('validates required string', () => {
  notValid(notEmpty('', 'change'))
  notValid(notEmpty('', 'blur'))
  notValid(notEmpty('', 'keyup'))
  notValid(notEmpty('  ', 'change'))

  valid(notEmpty('', 'init'))
  valid(notEmpty('  ', 'init'))
  valid(notEmpty('value', 'change'))
})

test('validates URL', () => {
  notValid(validUrl('', 'change'))
  notValid(validUrl('', 'blur'))
  notValid(validUrl('', 'keyup'))
  notValid(validUrl('example.com', 'change'))
  notValid(validUrl('not URL', 'change'))

  valid(validUrl('', 'init'))
  valid(validUrl('  ', 'init'))
  valid(validUrl('http://example.com', 'change'))
})

test('validates user ID', () => {
  notValid(validUserId('', 'change'))
  notValid(validUserId('', 'blur'))
  notValid(validUserId('', 'keyup'))
  notValid(validUserId('user@example.com', 'change'))
  notValid(validUserId('123456789012345', 'change'))
  notValid(validUserId('12345678901234567', 'change'))

  valid(validUserId('', 'init'))
  valid(validUserId('  ', 'init'))
  valid(validUserId('1234567890123456', 'change'))
})

test('validates secret', () => {
  notValid(validSecret('', 'change'))
  notValid(validSecret('', 'blur'))
  notValid(validSecret('', 'keyup'))
  notValid(validSecret('123456789 1234567890', 'change'))
  notValid(validSecret('1234567890 12345678901', 'change'))

  valid(validSecret('', 'init'))
  valid(validSecret('  ', 'init'))
  valid(validSecret('1234567890 ab3@5!7.-0', 'change'))
})

test('validates server', () => {
  notValid(validServer('', 'change'))
  notValid(validServer('', 'blur'))
  notValid(validServer('', 'keyup'))
  notValid(validServer('http://example.com', 'change'))
  notValid(validServer('user@example.com', 'change'))
  notValid(validServer('example com', 'change'))

  valid(validServer('', 'init'))
  valid(validServer('  ', 'init'))
  valid(validServer('example.com', 'change'))
  valid(validServer('example.com/path', 'change'))
  valid(validServer('example.com:31339', 'change'))
  valid(validServer('192.168.1.100:31339', 'change'))
})
