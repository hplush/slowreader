import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  createDownloadTask,
  createTextResponse,
  type DownloadTask,
  loaders,
  type PostsList,
  setRequestMethod,
  setupEnvironment,
  testFeed,
  type TextResponse
} from '../../index.ts'
import {
  checkAndRemoveRequestMock,
  expectNotMine,
  expectRequest,
  getTestEnvironment,
  mockRequest,
  postsValue,
  setupNodeDom
} from '../utils.ts'

setupNodeDom()

async function loadedPosts(posts: PostsList): Promise<unknown> {
  await posts.loading
  return postsValue(posts)
}

function expectIcon(url: string): void {
  expectRequest(url).andRespond(200, 'IMAGE', 'image/png')
}

function expectNoSiteIcon(): void {
  expectRequest('https://example.com/').andRespond(404)
  expectRequest('https://example.com/favicon.ico').andRespond(404)
}

async function loadAvatar(
  response: TextResponse,
  task: DownloadTask,
  url: string
): Promise<string | undefined> {
  return (await loaders.jsonFeed.loadFeedData(task, url, { response })).avatar
}

describe('json feed loader', () => {
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

  test('ignores non-JSON content', async () => {
    await expectNotMine(
      loaders.jsonFeed,
      createTextResponse('<feed></feed>', {
        headers: new Headers({
          'Content-Type': `application/atom+xml`
        })
      })
    )
  })

  test('loads feed avatar', async () => {
    let task = createDownloadTask()
    expectIcon('https://example.com/icon.png')
    equal(
      await loadAvatar(
        exampleJson({
          ...jsonStub,
          favicon: '/favicon.png',
          icon: '/icon.png'
        }),
        task,
        'https://example.com/'
      ),
      'https://example.com/icon.png'
    )
    expectIcon('https://cdn.com/favicon.png')
    equal(
      await loadAvatar(
        exampleJson({ ...jsonStub, favicon: 'https://cdn.com/favicon.png' }),
        task,
        'https://example.com/'
      ),
      'https://cdn.com/favicon.png'
    )
    expectNoSiteIcon()
    equal(
      await loadAvatar(exampleJson(jsonStub), task, 'https://example.com/'),
      undefined
    )
    expectNoSiteIcon()
    equal(
      (
        await loaders.jsonFeed.loadFeedData(task, 'https://example.com/', {
          response: exampleJson(jsonStub)
        })
      ).title,
      jsonStub.title
    )
  })

  test('detects titles', async () => {
    deepEqual(
      loaders.jsonFeed.detectFeed(
        exampleJson(jsonStub),
        createDownloadTask(),
        'https://example.com/'
      ),
      { title: 'Some JSON Feed title' }
    )
    deepEqual(
      loaders.jsonFeed.detectFeed(
        exampleJson({
          author: {
            name: 'name',
            url: 'https://example.com/'
          },
          items: [],
          title: 'Title JSON feed version 1',
          version: 'https://jsonfeed.org/version/1'
        }),
        createDownloadTask(),
        'https://example.com/'
      ),
      { title: 'Title JSON feed version 1' }
    )
    await expectNotMine(
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
      loaders.jsonFeed.detectFeed(
        exampleJson({
          author: {
            name: 'name',
            url: 'https://example.com/'
          },
          items: [],
          title: '',
          version: 'https://jsonfeed.org/version/1.1'
        }),
        createDownloadTask(),
        'https://example.com/'
      ),
      { title: '' }
    )
  })

  test('detects content type by content', () => {
    deepEqual(
      loaders.jsonFeed.detectFeed(
        createTextResponse(
          JSON.stringify({
            items: [],
            title: 'A',
            version: 'https://jsonfeed.org/version/1'
          }),
          {
            headers: new Headers({ 'Content-Type': `text/html` })
          }
        ),
        createDownloadTask(),
        'https://example.com/'
      ),
      { title: 'A' }
    )
  })

  test('validate json feed format', async () => {
    let task = createDownloadTask()
    deepEqual(
      await loadedPosts(
        loaders.jsonFeed.getPosts(
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
      ),
      {
        error: undefined,
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
            updatedAt: undefined,
            url: 'https://example.com/'
          },
          {
            full: '<p>Alternative content</p>',
            intro: undefined,
            media: undefined,
            originId: 'somehashid2',
            publishedAt: 1641254400,
            title: 'title_2',
            updatedAt: undefined,
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
    deepEqual(postsValue(page), {
      error: undefined,
      hasNext: true,
      isLoading: true,
      list: []
    })

    await page.loading
    deepEqual(postsValue(page), {
      error: undefined,
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
          updatedAt: undefined,
          url: 'https://example.com/'
        },
        {
          full: '<p>Alternative content</p>',
          intro: undefined,
          media: undefined,
          originId: 'somehashid2',
          publishedAt: 1641254400,
          title: 'title_2',
          updatedAt: undefined,
          url: 'https://example.com/2'
        }
      ]
    })
  })

  test('validate wrong json feed format', async () => {
    let task = createDownloadTask()

    await expectNotMine(loaders.jsonFeed, exampleJson('1'))
    await expectNotMine(loaders.jsonFeed, exampleJson('true'))
    await expectNotMine(loaders.jsonFeed, exampleJson('null'))
    await expectNotMine(loaders.jsonFeed, exampleJson('[]'))
    await expectNotMine(loaders.jsonFeed, exampleJson('{'))

    // not valid versions
    let notValidDataVersions = [
      'https://somejson.org/version/1.1',
      'https://jsonfeed.org/version/2.1',
      '',
      'https://example.com'
    ]

    for (let version of notValidDataVersions) {
      await expectNotMine(
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
    await expectNotMine(
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
      await expectNotMine(
        loaders.jsonFeed,
        exampleJson({
          items: notValidItem,
          title: 'Some JSONFeed title',
          version: 'https://jsonfeed.org/version/1.1'
        })
      )
    }

    deepEqual(
      await loadedPosts(
        loaders.jsonFeed.getPosts(
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
      ),
      {
        error: undefined,
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
            updatedAt: undefined,
            url: undefined
          }
        ]
      }
    )
  })

  test('resolves URLs', async () => {
    expectRequest('https://example.com/posts/b.png').andRespond(200)
    let posts = loaders.jsonFeed.getPosts(
      createDownloadTask(),
      'https://example.com/feed.json',
      exampleJson({
        items: [
          {
            content_html: '<a href="/a">A</a><img data-src="b.png">',
            id: '1',
            url: 'https://example.com/posts/1'
          },
          { content_text: 'Text <a href="/a">', id: '2' }
        ],
        title: 'Feed',
        version: 'https://jsonfeed.org/version/1.1'
      })
    )
    await posts.loading
    deepEqual(
      posts.get().list.map(i => [i.full, i.media]),
      [
        [
          '<a href="https://example.com/a">A</a>' +
            '<img src="https://example.com/posts/b.png">',
          [
            {
              fromText: true,
              type: 'image',
              url: 'https://example.com/posts/b.png'
            }
          ]
        ],
        ['Text <a href="/a">', undefined]
      ]
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
                title: 'Chart',
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
    deepEqual(postsValue(page), {
      error: undefined,
      hasNext: true,
      isLoading: true,
      list: []
    })

    await page.loading
    deepEqual(postsValue(page), {
      error: undefined,
      hasNext: false,
      isLoading: false,
      list: [
        {
          full: '<p>HTML<img src="https://example.com/img_h.webp" /></p>',
          intro: 'summary',
          media: [
            { type: 'image', url: 'https://example.com/image.webp' },
            { type: 'image', url: 'https://example.com/banner_image.webp' },
            {
              fromText: true,
              type: 'image',
              url: 'https://example.com/img_h.webp'
            }
          ],
          originId: 'somehashid',
          publishedAt: 1641254400,
          title: 'title_1',
          updatedAt: undefined,
          url: 'https://example.com/'
        },
        {
          full:
            '<p><img src="https://example.com/img_0.webp">Text' +
            '<img src="https://example.com/img_1.webp"></p>',
          intro: undefined,
          media: [{ type: 'image', url: 'https://example.com/img.webp' }],
          originId: 'somehashid2',
          publishedAt: 1641254400,
          title: 'title_2',
          updatedAt: undefined,
          url: 'https://example.com/2'
        },
        {
          full: '3',
          intro: undefined,
          media: [
            {
              type: 'image/png',
              url: 'https://example.com/img.png',
              name: 'Chart'
            }
          ],
          originId: 'somehashid3',
          publishedAt: undefined,
          title: 'title_3',
          updatedAt: undefined,
          url: 'https://example.com/3'
        }
      ]
    })
  })

  test('parses update time', async () => {
    let posts = loaders.jsonFeed.getPosts(
      createDownloadTask(),
      'https://example.com/',
      exampleJson({
        items: [
          {
            date_modified: '2022-01-05T00:00:00Z',
            date_published: '2022-01-04T00:00:00Z',
            id: 'edited'
          },
          {
            date_modified: '2022-01-04T00:00:00Z',
            date_published: '2022-01-04T00:00:00Z',
            id: 'same'
          },
          { date_modified: '2022-01-05T00:00:00Z', id: 'unpublished' },
          {
            date_modified: '1969-12-31T23:59:59Z',
            date_published: '1969-12-31T00:00:00Z',
            id: 'negative'
          },
          {
            date_modified: 'broken',
            date_published: '2022-01-04T00:00:00Z',
            id: 'broken'
          }
        ],
        title: 'Feed',
        version: 'https://jsonfeed.org/version/1.1'
      })
    )
    await posts.loading
    deepEqual(
      posts.get().list.map(post => [post.publishedAt, post.updatedAt]),
      [
        [1641254400, 1641340800],
        [1641254400, undefined],
        [1641340800, undefined],
        [-86400, undefined],
        [1641254400, undefined]
      ]
    )
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

  test('handles conditional request when server returns 304', async () => {
    let callCount = 0
    let capturedOpts: RequestInit | undefined

    // Mock initial and refreshing requests
    setRequestMethod((url, opts) => {
      if (++callCount === 1) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              items: [
                {
                  id: 'test-post',
                  title: 'Test Post',
                  url: 'https://example.com/1'
                }
              ],
              title: 'Feed',
              version: 'https://jsonfeed.org/version/1.1'
            }),
            {
              headers: {
                'Content-Type': 'application/json',
                'Last-Modified': 'Thu, 01 Jan 2026 00:00:00 GMT'
              }
            }
          )
        )
      } else {
        capturedOpts = opts
        return Promise.resolve(new Response(null, { status: 304 }))
      }
    })

    let task = createDownloadTask()

    // Initial request
    let page1 = loaders.jsonFeed.getPosts(task, 'https://example.com/news/')
    await page1.loading
    equal(page1.get().list.length, 1)

    // Refreshing request
    let page2 = loaders.jsonFeed.getPosts(
      task,
      'https://example.com/news/',
      undefined,
      1767225600 // Thu, 01 Jan 2026 00:00:00 GMT
    )
    await page2.loading
    deepEqual(capturedOpts?.headers, {
      'If-Modified-Since': 'Thu, 01 Jan 2026 00:00:00 GMT'
    })
    equal(page2.get().list.length, 0)
  })
})
