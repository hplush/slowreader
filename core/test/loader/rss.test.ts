import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  createDownloadTask,
  createTextResponse,
  loaders,
  setRequestMethod,
  testFeed,
  type TextResponse
} from '../../index.ts'
import {
  checkAndRemoveRequestMock,
  expectNotMine,
  expectRequest,
  mockRequest,
  loadedPostsValue,
  postsValue,
  setupNodeDom
} from '../utils.ts'

setupNodeDom()

describe('rss loader', () => {
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
    expectNotMine(
      loaders.rss,
      exampleRss('<unknown><title>No</title></unknown>')
    )
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

  test('parses posts', async () => {
    let task = createDownloadTask()
    deepEqual(
      await loadedPostsValue(
        loaders.rss.getPosts(
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
      ),
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

  test('parses media', async () => {
    let task = createDownloadTask()
    deepEqual(
      await loadedPostsValue(
        loaders.rss.getPosts(
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
      ),
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
              '\n                    ' +
              '<img src="https://example.com/img.webp"/>' +
              '\n                  ',
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

  test('resolves images by xml:base and site root', async () => {
    let posts = loaders.rss.getPosts(
      createDownloadTask(),
      'https://example.com/feed',
      exampleRss(
        `<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <item xml:base="https://cdn.example.com/files/">
              <link>https://example.com/posts/1</link>
              <description><![CDATA[<img src="a.png">]]></description>
            </item>
            <item>
              <link>https://example.com/posts/2</link>
              <description><![CDATA[<img src="/b.png">]]></description>
            </item>
          </channel>
        </rss>`
      )
    )
    await posts.loading
    deepEqual(
      posts.get().list.map(i => [i.full, i.media]),
      [
        [
          '<img src="https://cdn.example.com/files/a.png">',
          '[{"fromText":true,"type":"image",' +
            '"url":"https://cdn.example.com/files/a.png"}]'
        ],
        [
          '<img src="https://example.com/b.png">',
          '[{"fromText":true,"type":"image",' +
            '"url":"https://example.com/b.png"}]'
        ]
      ]
    )
  })

  test('resolves lazy-load images', async () => {
    let posts = loaders.rss.getPosts(
      createDownloadTask(),
      'https://example.com/feed',
      exampleRss(
        `<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <item xml:base="https://cdn.example.com/files/">
              <link>https://example.com/posts/1</link>
              <description><![CDATA[
                <img src="p.gif" data-src="a.png" data-srcset="a.png 1x, b.png 2x">
                <img data-lazy-src="c.png" data-lazy-srcset="d.png 2x">
                <picture><source data-srcset="e.avif"><img data-original="f.png"></picture>
              ]]></description>
            </item>
          </channel>
        </rss>`
      )
    )
    await posts.loading
    deepEqual(
      posts.get().list.map(i => [i.full!.trim(), i.media]),
      [
        [
          '<img src="https://cdn.example.com/files/a.png" ' +
            'srcset="https://cdn.example.com/files/a.png 1x, ' +
            'https://cdn.example.com/files/b.png 2x">\n' +
            '                <img src="https://cdn.example.com/files/c.png" ' +
            'srcset="https://cdn.example.com/files/d.png 2x">\n' +
            '                <picture><source ' +
            'srcset="https://cdn.example.com/files/e.avif">' +
            '<img src="https://cdn.example.com/files/f.png"></picture>',
          '[{"fromText":true,"type":"image",' +
            '"url":"https://cdn.example.com/files/a.png"},' +
            '{"fromText":true,"type":"image",' +
            '"url":"https://cdn.example.com/files/c.png"},' +
            '{"fromText":true,"type":"image",' +
            '"url":"https://cdn.example.com/files/f.png"}]'
        ]
      ]
    )
  })

  test('resolves links and media', async () => {
    let posts = loaders.rss.getPosts(
      createDownloadTask(),
      'https://example.com/feed',
      exampleRss(
        `<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <item>
              <link>https://example.com/posts/1</link>
              <description><![CDATA[<p><a href="/page">A</a><sup id="ref1"><a href="#fn1">1</a></sup><a href="#top">B</a></p><video src="a.mp4"><track src="/a.vtt"></video><ol><li id="fn1"><a href="#ref1">C</a></li></ol>]]></description>
            </item>
            <item>
              <link>https://example.com/posts/2</link>
              <description><![CDATA[<p><a href="https://other.com/">A</a></p>]]></description>
            </item>
          </channel>
        </rss>`
      )
    )
    await posts.loading
    deepEqual(
      posts.get().list.map(i => i.full),
      [
        '<p><a href="https://example.com/page">A</a>' +
          '<sup id="ref1"><a href="#fn1">1</a></sup>' +
          '<a href="https://example.com/posts/1#top">B</a></p>' +
          '<video src="https://example.com/posts/a.mp4">' +
          '<track src="https://example.com/a.vtt"></video>' +
          '<ol><li id="fn1"><a href="#ref1">C</a></li></ol>',
        '<p><a href="https://other.com/">A</a></p>'
      ]
    )
  })

  test('checks relative images by HTTP', async () => {
    expectRequest('https://example.com/posts/1/a.png').andRespond(200)
    let posts = loaders.rss.getPosts(
      createDownloadTask(),
      'https://example.com/feed',
      exampleRss(
        `<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <item>
              <link>https://example.com/posts/1/</link>
              <description><![CDATA[<img src="a.png">]]></description>
            </item>
            <item>
              <link>https://example.com/posts/2/</link>
              <description><![CDATA[<img src="b.png">]]></description>
            </item>
          </channel>
        </rss>`
      )
    )
    await posts.loading
    deepEqual(
      posts.get().list.map(i => i.full),
      [
        '<img src="https://example.com/posts/1/a.png">',
        '<img src="https://example.com/posts/2/b.png">'
      ]
    )
  })

  test('uses site root for broken relative images', async () => {
    expectRequest(
      'https://www.linux.org.ru/news/development/images/1/500px.jpg'
    ).andRespond(404)
    let posts = loaders.rss.getPosts(
      createDownloadTask(),
      'https://www.linux.org.ru/section-rss.jsp?section=1',
      exampleRss(
        `<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <item>
              <link>https://www.linux.org.ru/news/development/1</link>
              <description><![CDATA[
                <img src="https://www.linux.org.ru/images/1/1000px.jpg"
                  srcset="images/1/500px.jpg 500w,
                    https://www.linux.org.ru/images/1/original.png 900w">
              ]]></description>
            </item>
            <item>
              <link>https://www.linux.org.ru/news/development/2</link>
              <description><![CDATA[<img src="images/2/a.jpg">]]></description>
            </item>
          </channel>
        </rss>`
      )
    )
    await posts.loading
    deepEqual(
      posts.get().list.map(i => i.full?.trim()),
      [
        '<img src="https://www.linux.org.ru/images/1/1000px.jpg" ' +
          'srcset="https://www.linux.org.ru/images/1/500px.jpg 500w,\n' +
          '                    ' +
          'https://www.linux.org.ru/images/1/original.png 900w">',
        '<img src="https://www.linux.org.ru/images/2/a.jpg">'
      ]
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
})
