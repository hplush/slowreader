import '../dom-parser.ts'

import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'

import {
  checkAndRemoveRequestMock,
  createDownloadTask,
  createTextResponse,
  expectRequest,
  loaders,
  mockRequest,
  setupEnvironment,
  testFeed,
  type TextResponse
} from '../../index.ts'
import { expectNotMine, getTestEnvironment } from '../utils.ts'

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

setupEnvironment(getTestEnvironment())

beforeEach(() => {
  mockRequest()
})

afterEach(() => {
  checkAndRemoveRequestMock()
})

test('detects own URLs', () => {
  equal(
    typeof loaders.jsonFeed.isMineUrl(new URL('https://dev.to/')),
    'undefined'
  )
})

test('detects links', () => {
  deepEqual(
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
  deepEqual(
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

  deepEqual(
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
  deepEqual(
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
  deepEqual(
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

test('ignores non-JSON content', () => {
  expectNotMine(
    loaders.jsonFeed,
    createTextResponse('<feed></feed>', {
      headers: new Headers({
        'Content-Type': `application/atom+xml`
      })
    })
  )
})

test('detects titles', () => {
  equal(
    loaders.jsonFeed.isMineText(exampleJson(jsonStub)),
    'Some JSON Feed title'
  )
  deepEqual(
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
  expectNotMine(
    loaders.jsonFeed,
    exampleJson({
      author: {
        name: 'name',
        url: 'https://example.com/'
      },
      items: [],
      version: 'https://jsonfeed.org/version/1.1'
    })
  )
  deepEqual(
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
  deepEqual(
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
          media: undefined,
          originId: 'somehashid',
          publishedAt: 1641254400,
          title: 'title_1',
          url: 'https://example.com/'
        },
        {
          full: '<p>Alternative content</p>',
          intro: undefined,
          media: undefined,
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
  expectRequest('https://example.com/').andRespond(
    200,
    JSON.stringify({
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
    }),
    'application/json'
  )

  let task = createDownloadTask()
  let page = loaders.jsonFeed.getPosts(task, 'https://example.com/')
  deepEqual(page.get(), {
    hasNext: true,
    isLoading: true,
    list: []
  })

  await page.loading
  deepEqual(page.get(), {
    hasNext: false,
    isLoading: false,
    list: [
      {
        full: '<p>Priority Content</p>',
        intro: 'summary',
        media: undefined,
        originId: 'somehashid',
        publishedAt: 1641254400,
        title: 'title_1',
        url: 'https://example.com/'
      },
      {
        full: '<p>Alternative content</p>',
        intro: undefined,
        media: undefined,
        originId: 'somehashid2',
        publishedAt: 1641254400,
        title: 'title_2',
        url: 'https://example.com/2'
      }
    ]
  })
})

test('validate wrong json feed format', () => {
  let task = createDownloadTask()

  expectNotMine(loaders.jsonFeed, exampleJson('1'))
  expectNotMine(loaders.jsonFeed, exampleJson('true'))
  expectNotMine(loaders.jsonFeed, exampleJson('null'))
  expectNotMine(loaders.jsonFeed, exampleJson('[]'))
  expectNotMine(loaders.jsonFeed, exampleJson('{'))

  // not valid versions
  let notValidDataVersions = [
    'https://somejson.org/version/1.1',
    'https://jsonfeed.org/version/2.1',
    '',
    'https://example.com'
  ]

  for (let version of notValidDataVersions) {
    expectNotMine(
      loaders.jsonFeed,
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
    )
  }

  // not valid title
  expectNotMine(
    loaders.jsonFeed,
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
  )

  let notValidItems = [{}, 4, 'someString', false]
  for (let notValidItem of notValidItems) {
    expectNotMine(
      loaders.jsonFeed,
      exampleJson({
        items: notValidItem,
        title: 'Some JSONFeed title',
        version: 'https://jsonfeed.org/version/1.1'
      })
    )
  }

  deepEqual(
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
          media: undefined,
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
  expectRequest('https://example.com/').andRespond(
    200,
    JSON.stringify({
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
        },
        {
          attachments: [
            {
              mime_type: 'image/png',
              url: 'https://example.com/img.png'
            }
          ],
          content_text: '3',
          id: 'somehashid3',
          title: 'title_3',
          url: 'https://example.com/3'
        }
      ]
    }),
    'application/json'
  )

  let task = createDownloadTask()
  let page = loaders.jsonFeed.getPosts(task, 'https://example.com/')
  deepEqual(page.get(), {
    hasNext: true,
    isLoading: true,
    list: []
  })

  await page.loading
  deepEqual(page.get(), {
    hasNext: false,
    isLoading: false,
    list: [
      {
        full: '<p>HTML<img src="https://example.com/img_h.webp" /></p>',
        intro: 'summary',
        media:
          '[{"type":"image","url":"https://example.com/image.webp"},{"type":"image","url":"https://example.com/banner_image.webp"},{"fromText":true,"type":"image","url":"https://example.com/img_h.webp"}]',
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
        media: '[{"type":"image","url":"https://example.com/img.webp"}]',
        originId: 'somehashid2',
        publishedAt: 1641254400,
        title: 'title_2',
        url: 'https://example.com/2'
      },
      {
        full: '3',
        intro: undefined,
        media: '[{"type":"image/png","url":"https://example.com/img.png"}]',
        originId: 'somehashid3',
        publishedAt: undefined,
        title: 'title_3',
        url: 'https://example.com/3'
      }
    ]
  })
})

test('returns post source', async () => {
  let json = JSON.stringify({
    items: [
      {
        content_html: '<p>Post content</p>',
        date_published: '2023-01-01T00:00:00Z',
        id: 'post-1',
        title: 'Post 1',
        url: 'https://example.com/post-1'
      },
      {
        content_html: '<p>Another post</p>',
        date_published: '2023-01-02T00:00:00Z',
        id: 'post-2',
        title: 'Post 2',
        url: 'https://example.com/post-2'
      }
    ],
    title: 'Test Feed',
    version: 'https://jsonfeed.org/version/1.1'
  })

  expectRequest('https://example.com/feed.json').andRespond(
    200,
    json,
    'application/json'
  )
  deepEqual(
    await loaders.jsonFeed.getPostSource(
      testFeed({ url: 'https://example.com/feed.json' }),
      'post-1'
    ),
    {
      content_html: '<p>Post content</p>',
      date_published: '2023-01-01T00:00:00Z',
      id: 'post-1',
      title: 'Post 1',
      url: 'https://example.com/post-1'
    }
  )

  expectRequest('https://example.com/feed.json').andRespond(
    200,
    json,
    'application/json'
  )
  equal(
    await loaders.jsonFeed.getPostSource(
      testFeed({ url: 'https://example.com/feed.json' }),
      'unknown'
    ),
    undefined
  )
})
