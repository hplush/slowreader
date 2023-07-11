import '../test/dom-parser.js'

import { test } from 'uvu'
import { equal, type } from 'uvu/assert'

import { createTextResponse, loaders } from '../index.js'

test('detects own URLs', () => {
  type(loaders.atom.isMineUrl(new URL('https://dev.to/')), 'undefined')
})

test('detects links', () => {
  equal(
    loaders.atom.getMineLinksFromText(
      createTextResponse(
        '<!DOCTYPE html><html><head>' +
          '<link rel="alternate" type="application/atom+xml" href="/a">' +
          '<link rel="alternate" type="application/atom+xml" href="">' +
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
    loaders.atom.getMineLinksFromText(
      createTextResponse('<!DOCTYPE html><html><head></head></html>', {
        url: 'https://example.com/news/'
      })
    ),
    ['https://example.com/atom']
  )
})

test('ignores default URL on RSS link', () => {
  equal(
    loaders.atom.getMineLinksFromText(
      createTextResponse(
        '<!DOCTYPE html><html><head>' +
          '<link rel="alternate" type="application/rss+xml" href="/rss">' +
          '</head></html>',
        {
          url: 'https://example.com/news/'
        }
      )
    ),
    []
  )
})

test('detects titles', () => {
  function check(
    text: string,
    expected: ReturnType<typeof loaders.atom.isMineText>
  ): void {
    equal(
      loaders.atom.isMineText(
        createTextResponse(text, {
          headers: new Headers({ 'Content-Type': 'application/rss+xml' })
        })
      ),
      expected
    )
  }

  check('<feed></feed>', '')
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
