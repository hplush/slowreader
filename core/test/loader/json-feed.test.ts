import '../dom-parser.ts'

import { spyOn } from 'nanospy'
import { deepStrictEqual, equal } from 'node:assert'
import { test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  createDownloadTask,
  createTextResponse,
  loaders,
  type TextResponse
} from '../../index.ts'

function exampleJson(json: object | string): TextResponse {
  let string = typeof json === 'string' ? json : JSON.stringify(json)
  return createTextResponse(string, {
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
  equal(
    typeof loaders.jsonFeed.isMineUrl(new URL('https://dev.to/')),
    'undefined'
  )
})

test('detects links', () => {
  deepStrictEqual(
    loaders.jsonFeed.getMineLinksFromText(
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
          headers: new Headers({
            Link: '</news/json>; rel="alternate"; type="application/feed+json"'
          }),
          url: 'https://example.com/news/'
        }
      )
    ),
    [
      'https://example.com/news/json',
      'https://example.com/a',
      'https://example.com/news/b',
      'https://example.com/c',
      'http://other.com/d'
    ]
  )
  deepStrictEqual(
    loaders.jsonFeed.getMineLinksFromText(
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
          <body>
            <a href="/news/feed.json?id=12">Feed</a>s
          </body>
        </html>`,
        {
          url: 'https://example.com/news/'
        }
      )
    ),
    [
      'https://example.com/a',
      'https://example.com/news/b',
      'https://example.com/c',
      'http://other.com/d',
      'https://example.com/news/feed.json?id=12'
    ]
  )

  deepStrictEqual(
    loaders.jsonFeed.getMineLinksFromText(
      createTextResponse(
        `<!DOCTYPE html>
        <html>
          <head>
            <link rel="alternate" type="application/feed+json" href="/a">
            <link rel="alternate" type="application/feed+json" href="./b">
            <link type="application/json" href="http://other.com/d">
            <link type="application/json" href="http://other.com/m">
          </head>
        </html>`,
        {
          url: 'https://example.com/news/'
        }
      )
    ),
    ['https://example.com/a', 'https://example.com/news/b']
  )
})

test('ignores non-HTML documents for link search', () => {
  deepStrictEqual(
    loaders.rss.getMineLinksFromText(
      createTextResponse(
        `<rss>
          <link rel="alternate" type="application/feed+json" href="/a">
          <a href="/feeds.json">Feed</a>
        </rss>`,
        {
          url: 'https://example.com/news'
        }
      )
    ),
    []
  )
})

test('returns default links', () => {
  deepStrictEqual(
    loaders.jsonFeed.getSuggestedLinksFromText(
      createTextResponse(
        `<!DOCTYPE html>
        <html>
          <head>
          </head>
        </html>`,
        {
          url: 'https://example.com/news/'
        }
      )
    ),
    ['https://example.com/feed.json']
  )
})

test('detects titles', () => {
  equal(
    loaders.jsonFeed.isMineText(exampleJson(jsonStub)),
    'Some JSON Feed title'
  )
  deepStrictEqual(
    loaders.jsonFeed.isMineText(
      exampleJson({
        author: {
          name: 'name',
          url: 'https://example.com/'
        },
        items: [],
        title: 'Title JSON feed version 1',
        version: 'https://jsonfeed.org/version/1'
      })
    ),
    'Title JSON feed version 1'
  )
  deepStrictEqual(
    loaders.jsonFeed.isMineText(
      exampleJson({
        author: {
          name: 'name',
          url: 'https://example.com/'
        },
        items: [],
        version: 'https://jsonfeed.org/version/1.1'
      })
    ),
    false
  )
  deepStrictEqual(
    loaders.jsonFeed.isMineText(
      exampleJson({
        author: {
          name: 'name',
          url: 'https://example.com/'
        },
        items: [],
        title: '',
        version: 'https://jsonfeed.org/version/1.1'
      })
    ),
    ''
  )
})

test('detects content type by content', () => {
  equal(
    loaders.jsonFeed.isMineText(
      createTextResponse(
        JSON.stringify({
          items: [],
          title: 'A',
          version: 'https://jsonfeed.org/version/1'
        }),
        {
          headers: new Headers({ 'Content-Type': `text/html` })
        }
      )
    ),
    'A'
  )
})

test('validate json feed format', () => {
  let task = createDownloadTask()
  deepStrictEqual(
    loaders.jsonFeed
      .getPosts(
        task,
        'https://example.com/',
        exampleJson({
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
  let text = spyOn(task, 'text', () => {
    return Promise.resolve(
      exampleJson({
        ...jsonStub,
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
        ]
      })
    )
  })
  let page = loaders.jsonFeed.getPosts(task, 'https://example.com/')
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
  })
  deepStrictEqual(text.calls, [['https://example.com/']])
})

test('validate wrong json feed format', () => {
  let task = createDownloadTask()

  deepStrictEqual(loaders.jsonFeed.isMineText(exampleJson('1')), false)
  deepStrictEqual(loaders.jsonFeed.isMineText(exampleJson('true')), false)
  deepStrictEqual(loaders.jsonFeed.isMineText(exampleJson('null')), false)
  deepStrictEqual(loaders.jsonFeed.isMineText(exampleJson('[]')), false)
  deepStrictEqual(loaders.jsonFeed.isMineText(exampleJson('{')), false)

  // not valid versions
  let notValidDataVersions = [
    'https://somejson.org/version/1.1',
    'https://jsonfeed.org/version/2.1',
    '',
    'https://example.com'
  ]

  for (let version of notValidDataVersions) {
    deepStrictEqual(
      loaders.jsonFeed.isMineText(
        exampleJson({
          items: [
            {
              content_html: '<p>Priority Content</p>',
              content_text: '<p>Skipped content</p>',
              date_published: '2022-01-04T00:00:00Z',
              id: 'somehashid',
              summary: 'summary',
              title: 'title_1',
              url: 'https://example.com/'
            }
          ],
          title: 'Some JSON Feed title',
          version
        })
      ),
      false
    )
  }

  // not valid title
  deepStrictEqual(
    loaders.jsonFeed.isMineText(
      exampleJson({
        items: [
          {
            content_html: '<p>Priority Content</p>',
            content_text: '<p>Skipped content</p>',
            date_published: '2022-01-04T00:00:00Z',
            id: 'somehashid',
            summary: 'summary',
            title: 'title_1',
            url: 'https://example.com/'
          }
        ],
        title: [],
        version: 'https://jsonfeed.org/version/1.1'
      })
    ),
    false
  )

  let notValidItems = [{}, 4, 'someString', false]
  for (let notValidItem of notValidItems) {
    deepStrictEqual(
      loaders.jsonFeed.isMineText(
        exampleJson({
          items: notValidItem,
          title: 'Some JSONFeed title',
          version: 'https://jsonfeed.org/version/1.1'
        })
      ),
      false
    )
  }

  deepStrictEqual(
    loaders.jsonFeed
      .getPosts(
        task,
        'https://example.com/',
        exampleJson({
          items: [
            {
              id: 'somehashid',
              some_wrong_name_item: '<p>Priority Content</p>',
              some_wrong_name_item_2: '<p>Skipped content</p>'
            }
          ],
          title: 'JSON feed title',
          version: 'https://jsonfeed.org/version/1.1'
        })
      )
      .get(),
    {
      hasNext: false,
      isLoading: false,
      list: [
        {
          full: undefined,
          intro: undefined,
          media: [],
          originId: 'somehashid',
          publishedAt: undefined,
          title: undefined,
          url: undefined
        }
      ]
    }
  )
})

test('parses media', async () => {
  let task = createDownloadTask()
  let text = spyOn(task, 'text', () => {
    return Promise.resolve(
      exampleJson({
        ...jsonStub,
        items: [
          {
            banner_image: 'https://example.com/banner_image.webp',
            content_html:
              '<p>HTML<img src="https://example.com/img_h.webp" /></p>',
            content_text:
              '<p>Text<img src="https://example.com/img_t.webp" /></p>',
            date_published: '2022-01-04T00:00:00Z',
            id: 'somehashid',
            image: 'https://example.com/image.webp',
            summary: 'summary',
            title: 'title_1',
            url: 'https://example.com/'
          },
          {
            banner_image: 'https://example.com/img.webp',
            content_html: undefined,
            content_text:
              '<p><img src="https://example.com/img_0.webp">Text' +
              '<img src="https://example.com/img_1.webp"></p>',
            date_published: '2022-01-04T00:00:00Z',
            id: 'somehashid2',
            image: 'https://example.com/img.webp',
            title: 'title_2',
            url: 'https://example.com/2'
          }
        ]
      })
    )
  })
  let page = loaders.jsonFeed.getPosts(task, 'https://example.com/')
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
        full: '<p>HTML<img src="https://example.com/img_h.webp" /></p>',
        intro: 'summary',
        media: [
          'https://example.com/banner_image.webp',
          'https://example.com/image.webp',
          'https://example.com/img_h.webp'
        ],
        originId: 'somehashid',
        publishedAt: 1641254400,
        title: 'title_1',
        url: 'https://example.com/'
      },
      {
        full:
          '<p><img src="https://example.com/img_0.webp">Text' +
          '<img src="https://example.com/img_1.webp"></p>',
        intro: undefined,
        media: [
          'https://example.com/img.webp',
          'https://example.com/img_0.webp',
          'https://example.com/img_1.webp'
        ],
        originId: 'somehashid2',
        publishedAt: 1641254400,
        title: 'title_2',
        url: 'https://example.com/2'
      }
    ]
  })
  deepStrictEqual(text.calls, [['https://example.com/']])
})
