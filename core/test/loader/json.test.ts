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

function exampleJson(text: string): TextResponse {
  return createTextResponse(text, {
    headers: new Headers({ 'Content-Type': 'application/json' })
  })
}

let jsonStub = {
  author: {
    name: 'name',
    url: 'https://example.com/'
  },
  description: 'Test JSON Feed',
  feed_url: 'https://example.com/feed.json',
  home_page_url: 'https://example.com/',
  items: [],
  language: 'en',
  title: 'Some JSON Feed title',
  version: 'https://jsonfeed.org/version/1.1'
}

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
  // some website can provide JSON feed with application/json type, it's not a standard
  // but it's possible
  deepStrictEqual(
    loaders.json.getMineLinksFromText(
      createTextResponse(
        `<!DOCTYPE html>
        <html>
          <head>
            <link rel="alternate" type="application/json" href="/a">
            <link rel="alternate" type="application/json" href="">
            <link rel="alternate" type="application/json" href="./b">
            <link rel="alternate" type="application/json" href="../c">
            <link type="application/json" href="http://other.com/d">
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
    loaders.json.getMineLinksFromText(
      createTextResponse('<!DOCTYPE html><html><head></head></html>', {
        url: 'https://example.com/news/'
      }),
      []
    ),
    ['https://example.com/feed.json']
  )
})

test('detects titles', () => {
  equal(
    loaders.json.isMineText(exampleJson(JSON.stringify(jsonStub))),
    'Some JSON Feed title'
  )
  deepStrictEqual(
    loaders.json.isMineText(
      exampleJson(
        JSON.stringify({
          author: {
            name: 'name',
            url: 'https://example.com/'
          },
          title: 'Title JSON feed version 1',
          version: 'https://jsonfeed.org/version/1'
        })
      )
    ),
    'Title JSON feed version 1'
  )
  deepStrictEqual(
    loaders.json.isMineText(
      exampleJson(
        JSON.stringify({
          author: {
            name: 'name',
            url: 'https://example.com/'
          },
          version: 'https://jsonfeed.org/version/1.1'
        })
      )
    ),
    ''
  )
  deepStrictEqual(
    loaders.json.isMineText(
      exampleJson(
        JSON.stringify({
          author: {
            name: 'name',
            url: 'https://example.com/'
          },
          title: '',
          version: 'https://jsonfeed.org/version/1.1'
        })
      )
    ),
    ''
  )

  deepStrictEqual(
    loaders.json.isMineText(
      exampleJson(
        JSON.stringify({
          author: {
            name: 'name',
            url: 'https://example.com/'
          },
          title: ''
        })
      )
    ),
    false
  )
})

test('parses posts', async () => {
  let task = createDownloadTask()
  deepStrictEqual(
    loaders.json
      .getPosts(
        task,
        'https://example.com/',
        exampleJson(
          JSON.stringify({
            items: [
              {
                content_html: '<p>Priority Content</p>',
                content_text: '<p>Skipped content</p>',
                date_published: '2022-01-04T00:00:00Z',
                id: 'somehashid',
                summary: 'summary',
                title: 'title_1',
                url: 'https://example.com/'
              },
              {
                content_html: undefined,
                content_text: '<p>Alternative content</p>',
                date_published: '2022-01-04T00:00:00Z',
                id: 'somehashid2',
                title: 'title_2',
                url: 'https://example.com/2'
              }
            ],
            title: 'Some JSON Feed title',
            version: 'https://jsonfeed.org/version/1.1'
          })
        )
      )
      .get(),
    {
      hasNext: false,
      isLoading: false,
      list: [
        {
          full: '<p>Priority Content</p>',
          intro: 'summary',
          media: [],
          originId: 'somehashid',
          publishedAt: 1641254400,
          title: 'title_1',
          url: 'https://example.com/'
        },
        {
          full: '<p>Alternative content</p>',
          intro: undefined,
          media: [],
          originId: 'somehashid2',
          publishedAt: 1641254400,
          title: 'title_2',
          url: 'https://example.com/2'
        }
      ]
    }
  )
})

test('loads text to parse posts', async () => {
  let task = createDownloadTask()
  let text = spyOn(task, 'text', async () =>
    exampleJson(JSON.stringify(jsonStub))
  )
  let page = loaders.json.getPosts(task, 'https://example.com/news/')
  deepStrictEqual(page.get(), {
    hasNext: true,
    isLoading: true,
    list: []
  })

  await setTimeout(10)
  deepStrictEqual(page.get(), {
    hasNext: false,
    isLoading: false,
    list: []
    // list: [
    //   {
    //     full: undefined,
    //     media: [undefined],
    //     originId: 'https://example.com/news',
    //     publishedAt: undefined,
    //     summary: undefined,
    //     title: '1',
    //     url: 'https://example.com/news'
    //   },
    // ]
  })
  deepStrictEqual(text.calls, [['https://example.com/news/']])
})
