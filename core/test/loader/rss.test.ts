import '../dom-parser.js'

import { spyOn } from 'nanospy'
import { deepStrictEqual, equal } from 'node:assert'
import { test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  createDownloadTask,
  createTextResponse,
  loaders,
  type TextResponse
} from '../../index.js'

function exampleRss(xml: string): TextResponse {
  return createTextResponse(xml, {
    headers: new Headers({ 'Content-Type': 'application/rss+xml' })
  })
}

test('detects own URLs', () => {
  equal(typeof loaders.rss.isMineUrl(new URL('https://dev.to/')), 'undefined')
})

test('detects links', () => {
  deepStrictEqual(
    loaders.rss.getMineLinksFromText(
      createTextResponse(
        `<!DOCTYPE html>
        <html>
          <head>
            <link rel="alternate" type="application/rss+xml" href="/a">
            <link rel="alternate" type="application/rss+xml" href="">
            <link rel="alternate" type="application/rss+xml" href="./b">
            <link rel="alternate" type="application/rss+xml" href="../c">
            <link type="application/rss+xml" href="http://other.com/d">
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

test('returns default links', () => {
  deepStrictEqual(
    loaders.rss.getMineLinksFromText(
      createTextResponse('<!DOCTYPE html><html><head></head></html>', {
        url: 'https://example.com/news/'
      }),
      []
    ),
    ['https://example.com/feed', 'https://example.com/rss']
  )
})

test('ignores default URL on Atom link', () => {
  deepStrictEqual(
    loaders.rss.getMineLinksFromText(
      createTextResponse(
        `<!DOCTYPE html>
        <html>
          <head>
            <link rel="alternate" type="application/atom+xml" href="/atom">
          </head>
        </html>`
      ),
      []
    ),
    []
  )
  deepStrictEqual(
    loaders.atom.getMineLinksFromText(
      createTextResponse(
        `<!DOCTYPE html>
        <html></html>`
      ),
      [{ loader: 'atom', title: 'Atom', url: 'https://example.com/atom' }]
    ),
    []
  )
})

test('detects titles', () => {
  equal(
    loaders.rss.isMineText(
      exampleRss(
        `<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <title>Test 1</title>
          </channel>
        </rss>`
      )
    ),
    'Test 1'
  )
  equal(loaders.rss.isMineText(exampleRss('<rss version="2.0"></rss>')), '')
  equal(
    loaders.rss.isMineText(exampleRss('<unknown><title>No</title></unknown>')),
    false
  )
})

test('parses posts', async () => {
  let task = createDownloadTask()
  deepStrictEqual(
    loaders.rss
      .getPosts(
        task,
        'https://example.com/news/',
        exampleRss(
          `<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <title>Feed</title>
            <item>
              <title>1</title>
              <link>https://example.com/1</link>
              <description>Post 1</description>
            </item>
            <item>
              <title>2</title>
              <link>https://example.com/2</link>
              <guid>2</guid>
            </item>
            <item>
              <title>3</title>
            </item>
            <item>
              <guid>4</guid>
            </item>
          </channel>
        </rss>`
        )
      )
      .get(),
    {
      hasNext: false,
      isLoading: false,
      list: [
        {
          full: 'Post 1',
          media: [],
          originId: 'https://example.com/1',
          title: '1',
          url: 'https://example.com/1'
        },
        {
          full: undefined,
          media: [],
          originId: '2',
          title: '2',
          url: 'https://example.com/2'
        },
        {
          full: undefined,
          media: [],
          originId: '4',
          title: undefined,
          url: undefined
        }
      ]
    }
  )
})

test('loads text to parse posts', async () => {
  let task = createDownloadTask()
  let text = spyOn(task, 'text', async () =>
    exampleRss(
      `<?xml version="1.0"?>
      <rss version="2.0">
        <channel>
          <title>Feed</title>
          <item>
            <title>1</title>
            <link>https://example.com/1</link>
          </item>
        </channel>
      </rss>`
    )
  )
  let page = loaders.rss.getPosts(task, 'https://example.com/news/')
  deepStrictEqual(page.get(), {
    hasNext: true,
    isLoading: true,
    list: []
  })

  await setTimeout(10)
  deepStrictEqual(page.get(), {
    hasNext: false,
    isLoading: false,
    list: [
      {
        full: undefined,
        media: [],
        originId: 'https://example.com/1',
        title: '1',
        url: 'https://example.com/1'
      }
    ]
  })
  deepStrictEqual(text.calls, [['https://example.com/news/']])
})
