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
  parseMedia,
  setRequestMethod,
  setupEnvironment,
  testFeed,
  type TextResponse
} from '../../index.ts'
import {
  cleanClientTest,
  expectNotMine,
  expectWarning,
  getTestEnvironment
} from '../utils.ts'

function exampleAtom(responseBody: string): TextResponse {
  return createTextResponse(responseBody, {
    headers: new Headers({
      'Content-Type': `application/atom+xml`
    })
  })
}

setupEnvironment(getTestEnvironment())

beforeEach(() => {
  mockRequest()
})

afterEach(async () => {
  checkAndRemoveRequestMock()
  await cleanClientTest()
})

test('detects xml:base attribute', () => {
  deepEqual(
    loaders.atom.getMineLinksFromText(
      createTextResponse(
        `<html xml:base="http://example.com/today/"
          xmlns:xlink="http://www.w3.org/1999/xlink">
        <head>
          <title>Virtual Library</title>
        </head>
        <body>
          <olist>
            <item>
              <link type="application/atom+xml" href="1.xml">1</link>
            </item>
          </olist>
          <parent xml:base="/hotpicks/">
            <olist xml:base="fresh/">
              <item>
                <link type="application/atom+xml" href="2.xml">2</link>
              </item>
              <parent xml:base="fruit/">
                <item>
                  <link type="application/atom+xml" href="./3.xml">3</link>
                </item>
                <item>
                  <link type="application/atom+xml" href="../4.xml">4</link>
                </item>
              </parent>
            </olist>
          </parent>
          <olist xml:base="http://other.com/new/">
            <item>
              <link type="application/atom+xml" href="../5.xml">#5</link>
            </item>
            <parent xml:base="/timeless/">
              <item>
                <link type="application/atom+xml" href="6.xml">#6</link>
              </item>
            </parent>
            <parent xml:base="cars/">
              <item>
                <link type="application/atom+xml" href="7.xml">#7</link>
              </item>
            </parent>
          </olist>
        </body>
        </html>`,
        {
          url: 'http://example.com'
        }
      )
    ),
    [
      'http://example.com/today/1.xml',
      'http://example.com/hotpicks/fresh/2.xml',
      'http://example.com/hotpicks/fresh/fruit/3.xml',
      'http://example.com/hotpicks/fresh/4.xml',
      'http://other.com/5.xml',
      'http://example.com/timeless/6.xml',
      'http://other.com/new/cars/7.xml'
    ]
  )
})

test('detects own URLs', () => {
  equal(typeof loaders.atom.isMineUrl(new URL('https://dev.to/')), 'undefined')
})

test('detects links', () => {
  deepEqual(
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

test('finds atom links in <a> elements', () => {
  deepEqual(
    loaders.atom.getMineLinksFromText(
      createTextResponse(
        `<!DOCTYPE html>
        <html>
          <body>
            <a href="/news/atom">Atom Feed</a>
            <a href="https://example.com/blog/feed.xml">Feed XML</a>
            <a href="/something.atom">Feed Atom</a>
            <a href="/feed.something?id=1">Feed Atom</a>
            <a href="https://feeds.service.com/name">Other Domain</a>
            <a href="/comments">Comments Feed</a>
            <a href="/news">ATOM</a>
            <a href="/news.xml">News</a>
          </body>
        </html>`,
        {
          headers: new Headers({
            Link: '</news/feed>; rel="alternate"; type="application/atom+xml"'
          }),
          url: 'https://example.com/news'
        }
      )
    ),
    [
      'https://example.com/news/feed',
      'https://example.com/news/atom',
      'https://example.com/blog/feed.xml',
      'https://example.com/something.atom',
      'https://example.com/feed.something?id=1',
      'https://feeds.service.com/name',
      'https://example.com/comments',
      'https://example.com/news'
    ]
  )
})

test('finds XML links in <a> elements if nothings found before', () => {
  deepEqual(
    loaders.atom.getMineLinksFromText(
      createTextResponse(
        `<!DOCTYPE html>
        <html>
          <body>
            <a href="/news.xml">News</a>
          </body>
        </html>`,
        {
          url: 'https://example.com/news'
        }
      )
    ),
    ['https://example.com/news.xml']
  )
})

test('ignores non-HTML documents for link search', () => {
  deepEqual(
    loaders.rss.getMineLinksFromText(
      createTextResponse(
        `<rss>
          <link rel="alternate" type="application/atom+xml" href="/a">
          <a href="/atom">Feed</a>
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
    loaders.atom.getSuggestedLinksFromText(
      createTextResponse('<!DOCTYPE html><html><head></head></html>', {
        url: 'https://example.com/news/'
      })
    ),
    ['https://example.com/feed', 'https://example.com/atom']
  )
})

test('ignores non-XML content', () => {
  expectNotMine(
    loaders.atom,
    createTextResponse('{}', {
      headers: new Headers({
        'Content-Type': `application/feed+json`
      })
    })
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
  expectNotMine(
    loaders.atom,
    exampleAtom('<unknown><title>No</title></unknown>')
  )
})

test('detects content type by content', () => {
  equal(
    loaders.atom.isMineText(
      createTextResponse('<feed><title>A</title></feed>', {
        headers: new Headers({ 'Content-Type': `text/html` })
      })
    ),
    'A'
  )
  equal(
    loaders.atom.isMineText(
      createTextResponse(
        '<?xml version="1.0" encoding="UTF-8"?> ' +
          '<feed><title>B</title></feed>'
      )
    ),
    'B'
  )
})

test('detects type', () => {
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
  expectNotMine(
    loaders.atom,
    exampleAtom('<unknown><title>No</title></unknown>')
  )
})

test('detects popular XML mistakes', () => {
  equal(
    loaders.atom.isMineText(
      exampleAtom(
        `\r\n\r\n<?xml version="1.0" encoding="utf-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <title>Space before XML</title>
        </feed>`
      )
    ),
    'Space before XML'
  )
})

test('ignores text & comment nodes when probing', () => {
  equal(
    loaders.atom.isMineText(
      exampleAtom(
        '<?xml-stylesheet type="text/xsl" href="/nope"?><feed><title>Test</title></feed>'
      )
    ),
    'Test'
  )
})

test('parses posts', () => {
  let task = createDownloadTask()
  deepEqual(
    loaders.atom
      .getPosts(
        task,
        'https://example.com/news/',
        exampleAtom(
          `<?xml version="1.0"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <title>Feed</title>
          <entry>
            <title>1 <b>XSS</b></title>
            <link rel="alternate" href="https://example.com/1" />
            <content>Full 1</content>
            <id>1</id>
            <summary>Post 1 <b>XSS</b></summary>
            <published>2023-01-01T00:00:00Z</published>
            <updated>2023-06-01T00:00:00Z</updated>
          </entry>
          <entry>
            <title>2</title>
            <id>2</id>
            <link rel="related" href="https://example.com/2" />
            <updated>2023-06-01T00:00:00Z</updated>
          </entry>
          <entry>
            <title>3</title>
            <id>3</id>
            <link href="https://example.com/3" />
            <published>broken</published>
          </entry>
          <entry>
            <title>4</title>
            <published></published>
          </entry>
          <entry>
            <id>5</id>
          </entry>
        </feed>`
        )
      )
      .get(),
    {
      error: undefined,
      hasNext: false,
      isLoading: false,
      list: [
        {
          full: 'Full 1',
          intro: 'Post 1 XSS',
          media: undefined,
          originId: '1',
          publishedAt: 1672531200,
          title: '1 XSS',
          url: 'https://example.com/1'
        },
        {
          full: undefined,
          intro: undefined,
          media: undefined,
          originId: '2',
          publishedAt: 1685577600,
          title: '2',
          url: undefined
        },
        {
          full: undefined,
          intro: undefined,
          media: undefined,
          originId: '3',
          publishedAt: undefined,
          title: '3',
          url: 'https://example.com/3'
        },
        {
          full: undefined,
          intro: undefined,
          media: undefined,
          originId: '5',
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
      <feed xmlns="http://www.w3.org/2005/Atom">
        <title>Feed</title>
        <entry>
          <title>1</title>
          <id>1</id>
        </entry>
      </feed>`,
    'application/atom+xml'
  )

  let task = createDownloadTask()
  let page = loaders.atom.getPosts(task, 'https://example.com/news/')
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
        intro: undefined,
        media: undefined,
        originId: '1',
        publishedAt: undefined,
        title: '1',
        url: undefined
      }
    ]
  })
})

test('parses media', () => {
  let task = createDownloadTask()
  let posts = loaders.atom
    .getPosts(
      task,
      'https://example.com/news/',
      exampleAtom(
        `<?xml version="1.0"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <title>Feed</title>
          <entry>
            <title>1 <b>XSS</b></title>
            <link rel="alternate" href="https://example.com/1" />
            <content type="xhtml">
              <div xmlns="http://www.w3.org/1999/xhtml">
                <img src="https://example.com/img_first.webp"/>
                <b>Full</b> 1
                <img src="https://example.com/img_second.webp"/>
              </div>
            </content>
            <id>1</id>
            <summary>Post 1 <b>XSS</b></summary>
            <published>2023-01-01T00:00:00Z</published>
            <updated>2023-06-01T00:00:00Z</updated>
          </entry>
          <entry>
            <title>2</title>
            <link rel="enclosure" type="image/png"
              href="https://example.com/img.png" />
            <content type="xhtml">
              <xhtml:div xmlns:xhtml="http://www.w3.org/1999/xhtml">
                <xhtml:img src="https://example.com/img.webp"/>
              </xhtml:div>
            </content>
            <id>2</id>
            <summary>Post 2</summary>
            <published>2023-01-01T00:00:00Z</published>
            <updated>2023-06-01T00:00:00Z</updated>
          </entry>
        </feed>`
      )
    )
    .get()
  deepEqual(posts, {
    error: undefined,
    hasNext: false,
    isLoading: false,
    list: [
      {
        full:
          '\n' +
          '                <img src="https://example.com/img_first.webp"></img>\n' +
          '                <b>Full</b> 1\n' +
          '                <img src="https://example.com/img_second.webp"></img>\n' +
          '              ',
        intro: 'Post 1 XSS',
        media:
          '[{"fromText":true,"type":"image","url":"https://example.com/img_first.webp"},{"fromText":true,"type":"image","url":"https://example.com/img_second.webp"}]',
        originId: '1',
        publishedAt: 1672531200,
        title: '1 XSS',
        url: 'https://example.com/1'
      },
      {
        full:
          '\n' +
          '                <img src="https://example.com/img.webp"></img>\n' +
          '              ',
        intro: 'Post 2',
        media:
          '[{"type":"image/png","url":"https://example.com/img.png"},{"fromText":true,"type":"image","url":"https://example.com/img.webp"}]',
        originId: '2',
        publishedAt: 1672531200,
        title: '2',
        url: undefined
      }
    ]
  })
  deepEqual(parseMedia(posts.list[0]?.media), [
    {
      fromText: true,
      type: 'image',
      url: 'https://example.com/img_first.webp'
    },
    {
      fromText: true,
      type: 'image',
      url: 'https://example.com/img_second.webp'
    }
  ])
  deepEqual(parseMedia(undefined), [])

  expectWarning(() => {
    deepEqual(parseMedia('['), [])
  }, [new SyntaxError('Unexpected end of JSON input')])
})

test('detects pagination with rel="next" link', () => {
  let $store = loaders.atom.getPosts(
    createDownloadTask(),
    'https://example.com/feed/',
    exampleAtom(
      `<?xml version="1.0"?>
      <feed xmlns="http://www.w3.org/2005/Atom">
        <link rel="self" href="https://example.com/feeds/posts.atom"/>
        <link rel="next" href="https://example.com/feeds/posts-2024.atom"/>
      </feed>`
    )
  )
  equal($store.get().hasNext, true)
})

test('detects when there is no pagination', () => {
  let $store = loaders.atom.getPosts(
    createDownloadTask(),
    'https://example.com/feed/',
    exampleAtom(
      `<?xml version="1.0"?>
      <feed xmlns="http://www.w3.org/2005/Atom">
      </feed>`
    )
  )
  equal($store.get().hasNext, false)
})

test('loads first then second page', async () => {
  let task = createDownloadTask()

  expectRequest('https://example.com/feed').andRespond(
    200,
    `<?xml version="1.0"?>
      <feed xmlns="http://www.w3.org/2005/Atom">
        <link rel="next" href="https://example.com/feed?page=2" />
      </feed>`,
    'application/atom+xml'
  )
  let posts = loaders.atom.getPosts(task, 'https://example.com/feed')
  await posts.loading

  expectRequest('https://example.com/feed?page=2').andRespond(
    200,
    `<?xml version="1.0"?>
      <feed xmlns="http://www.w3.org/2005/Atom">
      </feed>`,
    'application/atom+xml'
  )
  await posts.next()
})

test('has posts from both pages', async () => {
  let task = createDownloadTask()

  expectRequest('https://example.com/feed').andRespond(
    200,
    `<?xml version="1.0"?>
      <feed xmlns="http://www.w3.org/2005/Atom">
        <link rel="next" href="https://example.com/feed?page=2" />
        <entry>
          <title>Post on page 1</title>
          <id>1</id>
          <published>2023-01-01T00:00:00Z</published>
        </entry>
      </feed>`,
    'application/atom+xml'
  )
  let posts = loaders.atom.getPosts(task, 'https://example.com/feed')
  await posts.loading

  expectRequest('https://example.com/feed?page=2').andRespond(
    200,
    `<?xml version="1.0"?>
      <feed xmlns="http://www.w3.org/2005/Atom">
        <entry>
          <title>Post on page 2</title>
          <id>2</id>
          <published>2023-01-02T00:00:00Z</published>
        </entry>
      </feed>`,
    'application/atom+xml'
  )
  await posts.next()

  equal(posts.get().list.length, 2)
  equal(posts.get().list[0]?.title, 'Post on page 1')
  equal(posts.get().list[1]?.title, 'Post on page 2')
})

test('returns post source', async () => {
  let xml = `<?xml version="1.0"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
      <title>Feed</title>
      <entry>
        <title>Post 1</title>
        <id>entry-1</id>
        <content>Content 1</content>
      </entry>
      <entry>
        <title>Post 2</title>
        <id>entry-2</id>
        <content>Content 2</content>
      </entry>
    </feed>`

  expectRequest('https://example.com/feed').andRespond(
    200,
    xml,
    'application/atom+xml'
  )
  equal(
    await loaders.atom.getPostSource(
      testFeed({ url: 'https://example.com/feed' }),
      'entry-2'
    ),
    `<entry xmlns="http://www.w3.org/2005/Atom">
        <title>Post 2</title>
        <id>entry-2</id>
        <content>Content 2</content>
      </entry>`
  )

  expectRequest('https://example.com/feed').andRespond(
    200,
    xml,
    'application/atom+xml'
  )
  equal(
    await loaders.atom.getPostSource(
      testFeed({ url: 'https://example.com/feed' }),
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
          `<?xml version="1.0"?>
          <feed xmlns="http://www.w3.org/2005/Atom">
            <title>Feed</title>
            <entry>
              <title>Test Post</title>
              <id>test-post</id>
              <link rel="alternate" href="https://example.com/1" />
            </entry>
          </feed>`,
          {
            headers: {
              'Content-Type': 'application/atom+xml',
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
  let page1 = loaders.atom.getPosts(task, 'https://example.com/news/')
  await page1.loading
  equal(page1.get().list.length, 1)

  // Refreshing request
  let page2 = loaders.atom.getPosts(
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
