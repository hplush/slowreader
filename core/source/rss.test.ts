import '../test/dom-parser.js'

import { test } from 'uvu'
import { equal, type } from 'uvu/assert'

import { createTextResponse, sources } from '../index.js'

test('detects own URLs', () => {
  type(sources.rss.isMineUrl(new URL('https://dev.to/')), 'undefined')
})

test('detects links', () => {
  equal(
    sources.rss.getMineLinksFromText(
      createTextResponse(
        '<!DOCTYPE html><html><head>' +
          '<link rel="alternate" type="application/rss+xml" href="/a">' +
          '<link rel="alternate" type="application/rss+xml" href="">' +
          '<link rel="alternate" type="application/atom+xml" href="./b">' +
          '<link rel="alternate" type="application/atom+xml" href="../c">' +
          '<link type="application/atom+xml" href="http://other.com/d">' +
          '</head></html>',
        {
          url: 'https://example.com/news/'
        }
      )
    ),
    [
      'https://example.com/a',
      'https://example.com/news/b',
      'https://example.com/c',
      'http://other.com/d'
    ]
  )
})

test('returns default links', () => {
  equal(
    sources.rss.getMineLinksFromText(
      createTextResponse(
        '<!DOCTYPE html><html><head>' +
          '<link rel="alternate" type="application/rss+xml" href="">' +
          '</head></html>',
        {
          url: 'https://example.com/news/'
        }
      )
    ),
    [
      'https://example.com/feed',
      'https://example.com/rss',
      'https://example.com/atom'
    ]
  )
})

test('detects titles', () => {
  function check(
    text: string,
    expected: ReturnType<typeof sources.rss.isMineText>
  ): void {
    equal(
      sources.rss.isMineText(
        createTextResponse(text, {
          headers: new Headers({ 'Content-Type': 'application/rss+xml' })
        })
      ),
      expected
    )
  }

  check(
    '<?xml version="1.0"?><rss version="2.0">' +
      '<channel><title>Test 1</title></channel></rss>',
    'Test 1'
  )
  check('<rss version="2.0"></rss>', '')
  check(
    '<?xml version="1.0" encoding="utf-8"?>' +
      '<feed xmlns="http://www.w3.org/2005/Atom">' +
      '<title>Test 2</title>' +
      '</feed>',
    'Test 2'
  )
  check('<unknown><title>No</title></unknown>', false)
})

test.run()
