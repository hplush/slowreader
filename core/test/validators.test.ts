import { equal } from 'node:assert'
import { test } from 'node:test'

import { notEmpty, validUrl } from '../index.ts'

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
