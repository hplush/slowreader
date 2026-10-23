import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  createDownloadTask,
  createTextResponse,
  loaders,
  testFeed,
  type TextResponse
} from '../../index.ts'
import {
  checkAndRemoveRequestMock,
  expectNotMine,
  expectRequest,
  loadedPostsValue,
  mockRequest,
  postsValue,
  setupNodeDom
} from '../utils.ts'

setupNodeDom()

function exampleRdf(body: string): TextResponse {
  return createTextResponse(
    `<?xml version="1.0"?>
    <rdf:RDF
      xmlns="http://purl.org/rss/1.0/"
      xmlns:content="http://purl.org/rss/1.0/modules/content/"
      xmlns:dc="http://purl.org/dc/elements/1.1/"
      xmlns:media="http://search.yahoo.com/mrss/"
      xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
    >
      ${body}
    </rdf:RDF>`,
    {
      headers: new Headers({ 'Content-Type': 'application/rdf+xml' }),
      url: 'https://example.com/index.rdf'
    }
  )
}

describe('rss1 loader', () => {
  beforeEach(() => {
    mockRequest()
  })

  afterEach(() => {
    checkAndRemoveRequestMock()
  })

  test('detects own URLs', () => {
    equal(loaders.rss1.isMineUrl(new URL('https://dev.to/')), undefined)
  })

  test('detects links', () => {
    deepEqual(
      loaders.rss1.getMineLinksFromText(
        createTextResponse(
          `<!DOCTYPE html>
          <html>
            <head>
              <link rel="alternate" type="application/rdf+xml" href="/a">
              <link rel="alternate" type="application/rss+xml" href="/b">
            </head>
            <body>
              <a href="/index.rdf">Feed</a>
              <a href="/rdf-guide">Guide</a>
            </body>
          </html>`,
          {
            headers: new Headers({
              Link: '</news.rdf>; rel="alternate"; type="application/rdf+xml"'
            }),
            url: 'https://example.com/news/'
          }
        )
      ),
      [
        'https://example.com/news.rdf',
        'https://example.com/a',
        'https://example.com/index.rdf'
      ]
    )
    deepEqual(
      loaders.rss1.getSuggestedLinksFromText(
        createTextResponse('<!DOCTYPE html><html></html>')
      ),
      []
    )
  })

  test('detects titles', async () => {
    deepEqual(
      loaders.rss1.detectFeed(
        exampleRdf(`
          <channel rdf:about="https://example.com/">
            <title>Blog <b>XSS</b></title>
          </channel>
        `),
        createDownloadTask(),
        'https://example.com/index.rdf'
      ),
      { title: 'Blog XSS' }
    )
    deepEqual(
      loaders.rss1.detectFeed(
        exampleRdf('<channel rdf:about="https://example.com/"></channel>'),
        createDownloadTask(),
        'https://example.com/index.rdf'
      ),
      { title: '' }
    )
    await expectNotMine(
      loaders.rss1,
      exampleRdf('<rdf:Description rdf:about="https://example.com/" />')
    )
    await expectNotMine(
      loaders.rss1,
      createTextResponse('<rss><channel><title>A</title></channel></rss>', {
        headers: new Headers({ 'Content-Type': 'application/rss+xml' })
      })
    )
    await expectNotMine(
      loaders.rss1,
      createTextResponse('{}', {
        headers: new Headers({ 'Content-Type': 'application/feed+json' })
      })
    )
  })

  test('is not detected by RSS 2.0 loader', async () => {
    await expectNotMine(
      loaders.rss,
      exampleRdf('<channel><title>Blog</title></channel>')
    )
  })

  test('loads feed data', async () => {
    let task = createDownloadTask()
    expectRequest('https://example.com/logo.png').andRespond(
      200,
      'IMAGE',
      'image/png'
    )
    deepEqual(
      await loaders.rss1.loadFeedData(task, 'https://example.com/', {
        response: exampleRdf(`
          <channel rdf:about="https://example.com/">
            <title>Blog</title>
            <image rdf:resource="https://example.com/logo.png" />
          </channel>
          <image rdf:about="https://example.com/logo.png">
            <url> /logo.png </url>
          </image>
        `)
      }),
      {
        avatar: 'https://example.com/logo.png',
        title: 'Blog',
        url: 'https://example.com/'
      }
    )
  })

  test('parses posts', async () => {
    let task = createDownloadTask()
    deepEqual(
      await loadedPostsValue(
        loaders.rss1.getPosts(
          task,
          'https://example.com/index.rdf',
          exampleRdf(`
            <channel rdf:about="https://example.com/">
              <title>Blog</title>
              <dc:language>en-gb</dc:language>
            </channel>
            <item rdf:about="https://example.com/1">
              <title>1 <b>XSS</b></title>
              <link>https://example.com/1</link>
              <description>Short</description>
              <content:encoded>&lt;p&gt;Full &lt;img src="/a.png"&gt;&lt;/p&gt;</content:encoded>
              <dc:date>2023-01-01T00:00:00Z</dc:date>
            </item>
            <item>
              <title>2</title>
              <link> https://example.com/2 </link>
              <description>Text</description>
              <media:content medium="image" url="https://example.com/b.png" />
            </item>
            <item>
              <title>No ID</title>
            </item>
          `)
        )
      ),
      {
        error: undefined,
        hasNext: false,
        isLoading: false,
        list: [
          {
            full: '<p>Full <img src="https://example.com/a.png"></p>',
            lang: 'en-GB',
            media: [
              {
                fromText: true,
                type: 'image',
                url: 'https://example.com/a.png'
              }
            ],
            originId: 'https://example.com/1',
            publishedAt: 1672531200,
            title: '1 XSS',
            url: 'https://example.com/1'
          },
          {
            full: 'Text',
            lang: 'en-GB',
            media: [{ type: 'image', url: 'https://example.com/b.png' }],
            originId: 'https://example.com/2',
            publishedAt: undefined,
            title: '2',
            url: 'https://example.com/2'
          }
        ]
      }
    )
  })

  test('loads text to parse posts', async () => {
    expectRequest('https://example.com/index.rdf').andRespond(
      200,
      `<?xml version="1.0"?>
      <rdf:RDF
        xmlns="http://purl.org/rss/1.0/"
        xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
      >
        <channel rdf:about="https://example.com/"><title>Blog</title></channel>
        <item rdf:about="https://example.com/1"><title>1</title></item>
      </rdf:RDF>`,
      'application/rdf+xml'
    )
    let page = loaders.rss1.getPosts(
      createDownloadTask(),
      'https://example.com/index.rdf'
    )
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
          url: undefined
        }
      ]
    })
  })

  test('returns post source', async () => {
    expectRequest('https://example.com/index.rdf').andRespond(
      200,
      exampleRdf(`
        <item rdf:about="https://example.com/1"><title>1</title></item>
        <item rdf:about="https://example.com/2"><title>2</title></item>
      `).text,
      'application/rdf+xml'
    )
    equal(
      await loaders.rss1.getPostSource(
        testFeed({ loader: 'rss1', url: 'https://example.com/index.rdf' }),
        'https://example.com/2'
      ),
      '<item xmlns="http://purl.org/rss/1.0/" ' +
        'xmlns:ns1="http://www.w3.org/1999/02/22-rdf-syntax-ns#" ' +
        'ns1:about="https://example.com/2"><title>2</title></item>'
    )
  })
})
