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

function exampleAtom(xml: string): TextResponse {
  return createTextResponse(xml, {
    headers: new Headers({ 'Content-Type': 'application/atom+xml' })
  })
}

test('detects own URLs', () => {
  equal(typeof loaders.atom.isMineUrl(new URL('https://dev.to/')), 'undefined')
})

test('detects links', () => {
  deepStrictEqual(
    loaders.atom.getMineLinksFromText(
      createTextResponse(
        `<!DOCTYPE html>
        <html>
          <head>
            <link rel="alternate" type="application/atom+xml" href="/a">
            <link rel="alternate" type="application/atom+xml" href="">
            <link rel="alternate" type="application/atom+xml" href="./b">
            <link rel="alternate" type="application/atom+xml" href="../c">
            <link type="application/atom+xml" href="http://other.com/d">
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
    loaders.atom.getMineLinksFromText(
      createTextResponse('<!DOCTYPE html><html><head></head></html>', {
        url: 'https://example.com/news/'
      }),
      []
    ),
    ['https://example.com/atom']
  )
})

test('ignores default URL on RSS link', () => {
  deepStrictEqual(
    loaders.atom.getMineLinksFromText(
      createTextResponse(
        `<!DOCTYPE html>
        <html>
          <head>
            <link rel="alternate" type="application/rss+xml" href="/rss">
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
      [{ loader: 'rss', title: 'RSS', url: 'https://example.com/rss' }]
    ),
    []
  )
})

test('detects titles', () => {
  equal(loaders.atom.isMineText(exampleAtom('<feed></feed>')), '')
  equal(
    loaders.atom.isMineText(
      exampleAtom(
        `<?xml version="1.0" encoding="utf-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <title>Test 2</title>
        </feed>`
      )
    ),
    'Test 2'
  )
  equal(
    loaders.atom.isMineText(
      exampleAtom('<unknown><title>No</title></unknown>')
    ),
    false
  )
})

test('parses posts', async () => {
  let task = createDownloadTask()
  deepStrictEqual(
    loaders.atom
      .getPosts(
        task,
        'https://example.com/news/',
        exampleAtom(
          `<?xml version="1.0"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <title>Feed</title>
          <entry>
            <title>1</title>
            <link rel="alternate" href="https://example.com/1" />
            <content>Full 1</content>
            <id>1</id>
            <summary>Post 1</summary>
          </entry>
          <entry>
            <title>2</title>
            <id>2</id>
            <link rel="related" href="https://example.com/2" />
          </entry>
          <entry>
            <title>3</title>
            <id>3</id>
            <link href="https://example.com/3" />
          </entry>
          <entry>
            <title>4</title>
          </entry>
          <entry>
            <id>5</id>
          </entry>
        </feed>`
        )
      )
      .get(),
    {
      hasNext: false,
      isLoading: false,
      list: [
        {
          full: 'Full 1',
          id: '1',
          intro: 'Post 1',
          media: [],
          title: '1',
          url: 'https://example.com/1'
        },
        {
          full: undefined,
          id: '2',
          intro: undefined,
          media: [],
          title: '2',
          url: undefined
        },
        {
          full: undefined,
          id: '3',
          intro: undefined,
          media: [],
          title: '3',
          url: 'https://example.com/3'
        },
        {
          full: undefined,
          id: '5',
          intro: undefined,
          media: [],
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
    exampleAtom(
      `<?xml version="1.0"?>
      <feed xmlns="http://www.w3.org/2005/Atom">
        <title>Feed</title>
        <entry>
          <title>1</title>
          <id>1</id>
        </entry>
      </feed>`
    )
  )
  let page = loaders.atom.getPosts(task, 'https://example.com/news/')
  deepStrictEqual(page.get(), {
    hasNext: true,
    isLoading: true,
    list: []
  })

  await setTimeout(100)
  deepStrictEqual(page.get(), {
    hasNext: false,
    isLoading: false,
    list: [
      {
        full: undefined,
        id: '1',
        intro: undefined,
        media: [],
        title: '1',
        url: undefined
      }
    ]
  })
  deepStrictEqual(text.calls, [['https://example.com/news/']])
})
