import { equal, is } from 'uvu/assert'
import { test } from 'uvu'

import { createResource, checkResource } from '../index.js'

test('creates resource', () => {
  equal(createResource('https://example.com/'), {
    url: new URL('https://example.com/')
  })
  equal(createResource('http://example.com'), {
    url: new URL('http://example.com/')
  })
  equal(createResource('twitter.com/a'), {
    url: new URL('https://twitter.com/a')
  })
  equal(createResource('example.com'), { url: new URL('http://example.com/') })
  equal(createResource('example.com '), { url: new URL('http://example.com/') })

  equal(createResource(''), 'emptyUrl')
  equal(createResource(' '), 'emptyUrl')

  equal(createResource('mailto:user@example.com'), 'invalidUrl')
  equal(createResource('http://a b'), 'invalidUrl')
  equal(createResource('not URL'), 'invalidUrl')
})

test('validates resource', () => {
  is(checkResource(createResource('')), false)
  is(checkResource(createResource('not URL')), false)
  is(checkResource(createResource('example.com')), true)
})

test.run()
