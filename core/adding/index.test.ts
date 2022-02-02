import { equal, is } from 'uvu/assert'
import { test } from 'uvu'

import { getSourceFromUrl, normalizeUrl } from './index.js'

test('iterates through sources', () => {
  equal(getSourceFromUrl('twitter.com/user'), 'twitter')
  equal(getSourceFromUrl('example.com'), 'unknown')
  equal(getSourceFromUrl(''), 'unknown')
})

test('validates URLs', () => {
  equal(normalizeUrl('example.com/'), new URL('http://example.com/'))
  equal(normalizeUrl('example.com '), new URL('http://example.com/'))
  equal(normalizeUrl('example.com/path'), new URL('http://example.com/path'))
  equal(normalizeUrl('https://example.com'), new URL('https://example.com'))
  equal(normalizeUrl('twitter.com/user'), new URL('https://twitter.com/user'))
  equal(normalizeUrl('twitter.com/user'), new URL('https://twitter.com/user'))

  is(normalizeUrl(' '), 'empty')
  is(normalizeUrl('mailto:user@example.com'), 'invalid')
  is(normalizeUrl('not URL'), 'invalid')
})

test.run()
