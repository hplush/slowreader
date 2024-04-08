import '../dom-parser.js'

// import { spyOn } from 'nanospy'
import { deepStrictEqual, equal } from 'node:assert'
import { test } from 'node:test'
// import { setTimeout } from 'node:timers/promises'

import {
  // createDownloadTask,
  createTextResponse,
  loaders
  // type TextResponse
} from '../../index.js'

/*function exampleRss(xml: string): TextResponse {
  return createTextResponse(xml, {
    headers: new Headers({ 'Content-Type': 'application/rss+xml' })
  })
}*/

test('detects own URLs', () => {
  equal(typeof loaders.json.isMineUrl(new URL('https://dev.to/')), 'undefined')
})

test('detects links', () => {
  deepStrictEqual(
    loaders.json.getMineLinksFromText(
      createTextResponse(
        `<!DOCTYPE html>
        <html>
          <head>
            <link rel="alternate" type="application/feed+json" href="/a">
            <link rel="alternate" type="application/feed+json" href="">
            <link rel="alternate" type="application/feed+json" href="./b">
            <link rel="alternate" type="application/feed+json" href="../c">
            <link type="application/feed+json" href="http://other.com/d">
          </head>
        </html>`,
        {
          url: 'https://example.com/news/'
        }
      ),
      []
    ),
    [
      'https://example.com/a',
      'https://example.com/news/b',
      'https://example.com/c',
      'http://other.com/d'
    ]
  )
})
