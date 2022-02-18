import { equal } from 'uvu/assert'
import { test } from 'uvu'

import {
  getSourceFromPreviewUrl,
  isValidPreviewUrl,
  createPreviewUrl
} from '../../index.js'

test('iterates through sources', () => {
  equal(
    getSourceFromPreviewUrl(createPreviewUrl('twitter.com/user')),
    'twitter'
  )
  equal(getSourceFromPreviewUrl(createPreviewUrl('example.com')), 'unknown')
  equal(getSourceFromPreviewUrl(createPreviewUrl('')), 'unknown')
})

test('creates resource', () => {
  equal(createPreviewUrl('https://example.com/'), {
    url: new URL('https://example.com/')
  })
  equal(createPreviewUrl('http://example.com'), {
    url: new URL('http://example.com/')
  })
  equal(createPreviewUrl('twitter.com/a'), {
    url: new URL('https://twitter.com/a')
  })
  equal(createPreviewUrl('example.com'), {
    url: new URL('http://example.com/')
  })
  equal(createPreviewUrl('example.com '), {
    url: new URL('http://example.com/')
  })

  equal(createPreviewUrl(''), 'emptyUrl')
  equal(createPreviewUrl(' '), 'emptyUrl')

  equal(createPreviewUrl('mailto:user@example.com'), 'invalidUrl')
  equal(createPreviewUrl('http://a b'), 'invalidUrl')
  equal(createPreviewUrl('not URL'), 'invalidUrl')
})

test('validates resource', () => {
  equal(isValidPreviewUrl(createPreviewUrl('')), false)
  equal(isValidPreviewUrl(createPreviewUrl('not URL')), false)
  equal(isValidPreviewUrl(createPreviewUrl('example.com')), true)
})

test.run()
