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
  setRequestMethod,
  testFeed,
  type TextResponse
} from '../../index.ts'
import { expectNotMine } from '../utils.ts'

function exampleRss(responseBody: string): TextResponse {
  return createTextResponse(responseBody, {
    headers: new Headers({
      'Content-Type': `application/rss+xml`
    })
  })
}

beforeEach(() => {
  mockRequest()
})

afterEach(() => {
  checkAndRemoveRequestMock()
})

test('detects own URLs', () => {
  equal(typeof loaders.rss.isMineUrl(new URL('https://dev.to/')), 'undefined')
})

test('detects links', () => {
  deepEqual(
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
          headers: new Headers({
            Link: '</news/rss>; rel="alternate"; type="application/rss+xml"'
          }),
          url: 'https://example.com/news/'
        }
      )
    ),
    [
      'https://example.com/news/rss',
      'https://example.com/a',
      'https://example.com/news/b',
      'https://example.com/c',
      'http://other.com/d'
    ]
  )
})

test('finds rss links in <a> elements', () => {
  deepEqual(
    loaders.rss.getMineLinksFromText(
      createTextResponse(
        `<!DOCTYPE html>
        <html>
          <body>
            <a href="/news/rss">RSS Feed</a>
            <a href="/something.rss?id=1">Feed RSS</a>
            <a href="/news">RSS</a>
          </body>
        </html>`,
        {
          url: 'https://example.com/news'
        }
      )
    ),
    [
      'https://example.com/news/rss',
      'https://example.com/something.rss?id=1',
      'https://example.com/news'
    ]
  )
})

test('ignores non-HTML documents for link search', () => {
  deepEqual(
    loaders.rss.getMineLinksFromText(
      createTextResponse(
        `<rss>
          <link rel="alternate" type="application/rss+xml" href="/a">
          <a href="/rss">Feed</a>
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
    loaders.rss.getSuggestedLinksFromText(
      createTextResponse('<!DOCTYPE html><html><head></head></html>', {
        url: 'https://example.com/news/'
      })
    ),
    ['https://example.com/rss']
  )
})

test('ignores non-XML content', () => {
  expectNotMine(
    loaders.rss,
    createTextResponse('{}', {
      headers: new Headers({
        'Content-Type': `application/feed+json`
      })
    })
  )
})

test('detects titles', () => {
  equal(
    loaders.rss.isMineText(
      exampleRss(
        `<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <title>Test 1 <b>XSS</b></title>
          </channel>
        </rss>`
      )
    ),
    'Test 1 XSS'
  )
  equal(loaders.rss.isMineText(exampleRss('<rss version="2.0"></rss>')), '')
  expectNotMine(loaders.rss, exampleRss('<unknown><title>No</title></unknown>'))
})

test('detects content type by content', () => {
  equal(
    loaders.rss.isMineText(
      createTextResponse('<rss><channel><title>A</title></channel></rss>', {
        headers: new Headers({ 'Content-Type': `text/html` })
      })
    ),
    'A'
  )
  equal(
    loaders.rss.isMineText(
      createTextResponse(
        '<?xml version="1.0" encoding="UTF-8"?> ' +
          '<rss><channel><title>B</title></channel></rss>'
      )
    ),
    'B'
  )
})

test('ignores text & comment nodes when probing', () => {
  equal(
    loaders.rss.isMineText(
      exampleRss(
        `<?xml-stylesheet type="text/xsl" href="/nope"?>
        <rss version="2.0">
          <channel>
            <title>Test</title>
          </channel>
        </rss>`
      )
    ),
    'Test'
  )
})

test('parses posts', () => {
  let task = createDownloadTask()
  deepEqual(
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
              <title>1 <b>XSS</b></title>
              <link>https://example.com/1</link>
              <description>Post 1 <b>XSS</b></description>
              <pubDate>Mon, 01 Jan 2023 00:00:00 GMT</pubDate>
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
      error: undefined,
      hasNext: false,
      isLoading: false,
      list: [
        {
          full: 'Post 1 XSS',
          media: undefined,
          originId: 'https://example.com/1',
          publishedAt: 1672531200,
          title: '1 XSS',
          url: 'https://example.com/1'
        },
        {
          full: undefined,
          media: undefined,
          originId: '2',
          publishedAt: undefined,
          title: '2',
          url: 'https://example.com/2'
        },
        {
          full: undefined,
          media: undefined,
          originId: '4',
          publishedAt: undefined,
          title: undefined,
          url: undefined
        }
      ]
    }
  )
})

test('loads text to parse posts', async () => {
  expectRequest('https://example.com/news/').andRespond(
    200,
    `<?xml version="1.0"?>
      <rss version="2.0">
        <channel>
          <title>Feed</title>
          <item>
            <title>1</title>
            <link>https://example.com/1</link>
          </item>
        </channel>
      </rss>`,
    'application/rss+xml'
  )

  let task = createDownloadTask()
  let page = loaders.rss.getPosts(task, 'https://example.com/news/')
  deepEqual(page.get(), {
    error: undefined,
    hasNext: true,
    isLoading: true,
    list: []
  })

  await page.loading
  deepEqual(page.get(), {
    error: undefined,
    hasNext: false,
    isLoading: false,
    list: [
      {
        full: undefined,
        media: undefined,
        originId: 'https://example.com/1',
        publishedAt: undefined,
        title: '1',
        url: 'https://example.com/1'
      }
    ]
  })
})

test('parses media', () => {
  let task = createDownloadTask()
  deepEqual(
    loaders.rss
      .getPosts(
        task,
        'https://example.com/news/',
        exampleRss(
          `<?xml version="1.0"?>
          <rss
            xmlns:atom="http://www.w3.org/2005/Atom"
            xmlns:content="http://purl.org/rss/1.0/modules/content/"
            xmlns:dc="http://purl.org/dc/elements/1.1/"
            xmlns:media="http://search.yahoo.com/mrss/"
            version="2.0"
          >
            <channel>
              <title>Feed</title>
              <item>
                <title>1 <b>XSS</b></title>
                <link>https://example.com/1</link>
                <media:content
                  medium="image"
                  url="https://example.com/image_from_media_content.webp"
                />
                <description>Post 1 <b>XSS</b></description>
                <pubDate>Mon, 01 Jan 2023 00:00:00 GMT</pubDate>
              </item>
              <item>
                <title>2</title>
                <link>https://example.com/2</link>
                <media:content medium="image" type="image/png">
                  <media:thumbnail url="https://example.com/thumbnail.png" />
                </media:content>
                <description>2 text</description>
                <pubDate>Mon, 01 Jan 2023 00:00:00 GMT</pubDate>
              </item>
              <item>
                <title>3</title>
                <link>https://example.com/3</link>
                <enclosure url="https://example.com/image.jpg"
                  length="1024" type="image/jpeg"/>
                  <media:content
                    medium="image"
                    url="https://example.com/image.jpg"
                  />
                <description>
                  &lt;img src="https://example.com/img.webp"/&gt;
                </description>
                <pubDate>Mon, 01 Jan 2023 00:00:00 GMT</pubDate>
              </item>
            </channel>
          </rss>`
        )
      )
      .get(),
    {
      error: undefined,
      hasNext: false,
      isLoading: false,
      list: [
        {
          full: 'Post 1 XSS',
          media:
            '[{"type":"image","url":"https://example.com/image_from_media_content.webp"}]',
          originId: 'https://example.com/1',
          publishedAt: 1672531200,
          title: '1 XSS',
          url: 'https://example.com/1'
        },
        {
          full: '2 text',
          media:
            '[{"type":"image/png","url":"https://example.com/thumbnail.png"}]',
          originId: 'https://example.com/2',
          publishedAt: 1672531200,
          title: '2',
          url: 'https://example.com/2'
        },
        {
          full:
            '\n                  ' +
            '<img src="https://example.com/img.webp"/>' +
            '\n                ',
          media:
            '[{"type":"image/jpeg","url":"https://example.com/image.jpg"},{"fromText":true,"type":"image","url":"https://example.com/img.webp"}]',
          originId: 'https://example.com/3',
          publishedAt: 1672531200,
          title: '3',
          url: 'https://example.com/3'
        }
      ]
    }
  )
})

test('returns post source', async () => {
  let xml = `<?xml version="1.0"?>
  <rss version="2.0">
    <channel>
      <title>Feed</title>
      <item>
        <title>First Post</title>
        <link>https://example.com/1</link>
        <guid>post-1</guid>
        <description>Content 1</description>
      </item>
      <item>
        <title>First Post</title>
        <link>https://example.com/1</link>
        <guid>post-1</guid>
        <description>Content 1</description>
      </item>
      <item>
        <title>Second Post</title>
        <link>https://example.com/2</link>
        <guid>post-2</guid>
        <description>Content 2</description>
      </item>
    </channel>
  </rss>`

  expectRequest('https://example.com/feed').andRespond(
    200,
    xml,
    'application/rss+xml'
  )
  equal(
    await loaders.rss.getPostSource(
      testFeed({ url: 'https://example.com/feed' }),
      'post-2'
    ),
    `<item>
        <title>Second Post</title>
        <link>https://example.com/2</link>
        <guid>post-2</guid>
        <description>Content 2</description>
      </item>`
  )

  expectRequest('https://example.com/feed').andRespond(
    200,
    xml,
    'application/rss+xml'
  )
  equal(
    await loaders.rss.getPostSource(
      testFeed({ url: 'https://example.com/feed' }),
      'unknown'
    ),
    undefined
  )
})

test('sends If-Modified-Since header when refreshedAt is provided', async () => {
  let capturedOpts: RequestInit | undefined

  setRequestMethod((url, opts) => {
    capturedOpts = opts
    return Promise.resolve(
      new Response(
        `<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <title>Feed</title>
            <item>
              <title>Test Post</title>
              <link>https://example.com/1</link>
            </item>
          </channel>
        </rss>`,
        {
          headers: { 'Content-Type': 'application/rss+xml' }
        }
      )
    )
  })

  let task = createDownloadTask()
  let page = loaders.rss.getPosts(
    task,
    'https://example.com/news/',
    undefined,
    1767225600 // Thu, 01 Jan 2026 00:00:00 GMT
  )

  await page.loading

  deepEqual(capturedOpts?.headers, {
    'If-Modified-Since': 'Thu, 01 Jan 2026 00:00:00 GMT'
  })

  deepEqual(page.get(), {
    error: undefined,
    hasNext: false,
    isLoading: false,
    list: [
      {
        full: undefined,
        media: undefined,
        originId: 'https://example.com/1',
        publishedAt: undefined,
        title: 'Test Post',
        url: 'https://example.com/1'
      }
    ]
  })
})

test('handles conditional request when server returns 304', async () => {
  let callCount = 0
  let capturedOpts: RequestInit | undefined

  // Mock initial and refreshing requests
  setRequestMethod((url, opts) => {
    if (++callCount === 1) {
      return Promise.resolve(
        new Response(
          `<?xml version="1.0"?>
          <rss version="2.0">
            <channel>
              <title>Feed</title>
              <item>
                <title>Test Post</title>
                <link>https://example.com/1</link>
              </item>
            </channel>
          </rss>`,
          {
            headers: {
              'Content-Type': 'application/rss+xml',
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
  let page1 = loaders.rss.getPosts(task, 'https://example.com/news/')
  await page1.loading
  equal(page1.get().list.length, 1)

  // Refreshing request
  let page2 = loaders.rss.getPosts(
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
