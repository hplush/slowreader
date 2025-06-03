import { deepStrictEqual } from 'node:assert'
import { test } from 'node:test'

import { createTextResponse } from '../../download.js'
import { findHeaderLinks } from '../../loader/utils.js'

test('returns urls from link http header', () => {
  deepStrictEqual(
    findHeaderLinks(
      createTextResponse(`<!DOCTYPE html><html><head></head></html>`, {
        headers: new Headers({
          Link: '<https://one.example.com>; rel="alternate"; type="application/rss+xml"'
            + ', <https://two.example.com>; rel="alternate"; type="application/rss+xml"'
        }),
        url: 'https://example.com'
      }),
      'application/rss+xml'
    ),
    ['https://one.example.com', 'https://two.example.com']
  )
})

test('handles root-relative urls in http header', () => {
  deepStrictEqual(
    findHeaderLinks(
      createTextResponse(`<!DOCTYPE html><html><head></head></html>`, {
        headers: new Headers({
          Link: '</rss>; rel="alternate"; type="application/atom+xml"'
        }),
        url: 'https://example.com/blog'
      }),
      'application/atom+xml'
    ),
    ['https://example.com/rss']
  )
})

test('handles relative urls in http header', () => {
  deepStrictEqual(
    findHeaderLinks(
      createTextResponse(`<!DOCTYPE html><html><head></head></html>`, {
        headers: new Headers({
          Link: '<./rss>; rel="alternate"; type="application/atom+xml"'
        }),
        url: 'https://example.com/blog/'
      }),
      'application/atom+xml'
    ),
    ['https://example.com/blog/rss']
  )
})
