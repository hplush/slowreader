import '../dom-parser.js'

import { spyOn } from 'nanospy'
import { deepStrictEqual, equal } from 'node:assert'
import { test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import { createDownloadTask, createTextResponse, loaders } from '../../index.js'
import { getResponseCreator } from '../utils.js'

const exampleAtom = getResponseCreator('atom')

test('detects xml:base attribute', () => {
  deepStrictEqual(
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
  deepStrictEqual(
    loaders.atom.getMineLinksFromText(
      createTextResponse(
        `<!DOCTYPE html>
        <html>
          <body>
            <a href="/atom">Atom Feed</a>
            <a href="https://example.com/blog/feed.xml">Feed XML</a>
            <a href="/something.atom">Feed Atom</a>
            <a href="/feed.something">Feed Atom</a>
          </body>
        </html>`,
        {
          url: 'https://example.com/news'
        }
      )
    ),
    [
      'https://example.com/atom',
      'https://example.com/blog/feed.xml',
      'https://example.com/something.atom',
      'https://example.com/feed.something'
    ]
  )
})

test('ignores non-HTML documents for link search', () => {
  deepStrictEqual(
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
  deepStrictEqual(
    loaders.atom.getSuggestedLinksFromText(
      createTextResponse('<!DOCTYPE html><html><head></head></html>', {
        url: 'https://example.com/news/'
      })
    ),
    ['https://example.com/feed', 'https://example.com/atom']
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
      hasNext: false,
      isLoading: false,
      list: [
        {
          full: 'Full 1',
          intro: 'Post 1 XSS',
          media: [],
          originId: '1',
          publishedAt: 1672531200,
          title: '1 XSS',
          url: 'https://example.com/1'
        },
        {
          full: undefined,
          intro: undefined,
          media: [],
          originId: '2',
          publishedAt: 1685577600,
          title: '2',
          url: undefined
        },
        {
          full: undefined,
          intro: undefined,
          media: [],
          originId: '3',
          publishedAt: undefined,
          title: '3',
          url: 'https://example.com/3'
        },
        {
          full: undefined,
          intro: undefined,
          media: [],
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
        intro: undefined,
        media: [],
        originId: '1',
        publishedAt: undefined,
        title: '1',
        url: undefined
      }
    ]
  })
  deepStrictEqual(text.calls, [['https://example.com/news/']])
})

test('parses media', async () => {
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
              <title>1 <b>XSS</b></title>
              <link rel="alternate" href="https://example.com/1" />
              <content>
                <img src="https://example.com/img_first.webp"/>
                Full 1
                <img src="https://example.com/img_second.webp"/>
              </content>
              <id>1</id>
              <summary>Post 1 <b>XSS</b></summary>
              <published>2023-01-01T00:00:00Z</published>
              <updated>2023-06-01T00:00:00Z</updated>
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
          full:
            '\n' +
            '                \n' +
            '                Full 1\n' +
            '                \n' +
            '              ',
          intro: 'Post 1 XSS',
          media: [
            'https://example.com/img_first.webp',
            'https://example.com/img_second.webp'
          ],
          originId: '1',
          publishedAt: 1672531200,
          title: '1 XSS',
          url: 'https://example.com/1'
        }
      ]
    }
  )
})
