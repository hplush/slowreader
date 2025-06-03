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

function exampleRss(responseBody: string): TextResponse {
  return createTextResponse(responseBody, {
    headers: new Headers({
      'Content-Type': `application/rss+xml`
    })
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
  deepStrictEqual(
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
  deepStrictEqual(
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
  deepStrictEqual(
    loaders.rss.getSuggestedLinksFromText(
      createTextResponse('<!DOCTYPE html><html><head></head></html>', {
        url: 'https://example.com/news/'
      })
    ),
    ['https://example.com/rss']
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
  equal(
    loaders.rss.isMineText(exampleRss('<unknown><title>No</title></unknown>')),
    false
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

test('parses posts', () => {
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
      hasNext: false,
      isLoading: false,
      list: [
        {
          full: 'Post 1 XSS',
          media: [],
          originId: 'https://example.com/1',
          publishedAt: 1672531200,
          title: '1 XSS',
          url: 'https://example.com/1'
        },
        {
          full: undefined,
          media: [],
          originId: '2',
          publishedAt: undefined,
          title: '2',
          url: 'https://example.com/2'
        },
        {
          full: undefined,
          media: [],
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
  let task = createDownloadTask()
  let text = spyOn(task, 'text', () => {
    return Promise.resolve(
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
  })
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
        publishedAt: undefined,
        title: '1',
        url: 'https://example.com/1'
      }
    ]
  })
  deepStrictEqual(text.calls, [['https://example.com/news/']])
})

test('parses media from media:content alone', () => {
  let task = createDownloadTask()
  deepStrictEqual(
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
          full: 'Post 1 XSS',
          media: ['https://example.com/image_from_media_content.webp'],
          originId: 'https://example.com/1',
          publishedAt: 1672531200,
          title: '1 XSS',
          url: 'https://example.com/1'
        }
      ]
    }
  )
})

test('parses media from description', () => {
  let task = createDownloadTask()
  deepStrictEqual(
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
                <description>
                  <img src="https://example.com/img.webp"/>Post 1 <b>XSS</b>
                </description>
                <pubDate>Mon, 01 Jan 2023 00:00:00 GMT</pubDate>
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
          full: '\n                  Post 1 XSS\n                ',
          media: ['https://example.com/img.webp'],
          originId: 'https://example.com/1',
          publishedAt: 1672531200,
          title: '1 XSS',
          url: 'https://example.com/1'
        }
      ]
    }
  )
})

test('parses media from media:content and description', () => {
  let task = createDownloadTask()
  deepStrictEqual(
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
                  url="https://example.com/img_0.webp"
                />
                <description>
                  <img src="https://example.com/img_1.webp"/>Post 1 <b>XSS</b>
                </description>
                <pubDate>Mon, 01 Jan 2023 00:00:00 GMT</pubDate>
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
          full: '\n                  Post 1 XSS\n                ',
          media: [
            'https://example.com/img_1.webp',
            'https://example.com/img_0.webp'
          ],
          originId: 'https://example.com/1',
          publishedAt: 1672531200,
          title: '1 XSS',
          url: 'https://example.com/1'
        }
      ]
    }
  )
})

test('parses media and removes duplicates', () => {
  let task = createDownloadTask()
  deepStrictEqual(
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
                  url="https://example.com/img.webp"
                />
                <description>
                  <img src="https://example.com/img.webp"/>Post 1 <b>XSS</b>
                </description>
                <pubDate>Mon, 01 Jan 2023 00:00:00 GMT</pubDate>
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
          full: '\n                  Post 1 XSS\n                ',
          media: ['https://example.com/img.webp'],
          originId: 'https://example.com/1',
          publishedAt: 1672531200,
          title: '1 XSS',
          url: 'https://example.com/1'
        }
      ]
    }
  )
})
