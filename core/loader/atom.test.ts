import '../test/dom-parser.js'

import { spyOn } from 'nanospy'
import { test } from 'uvu'
import { equal, type } from 'uvu/assert'

import { createDownloadTask, createTextResponse, loaders } from '../index.js'

test('detects own URLs', () => {
  type(loaders.atom.isMineUrl(new URL('https://dev.to/')), 'undefined')
})

test('detects links', () => {
  equal(
    loaders.atom.getMineLinksFromText(
      createTextResponse(
        '<!DOCTYPE html><html><head>' +
          '<link rel="alternate" type="application/atom+xml" href="/a">' +
          '<link rel="alternate" type="application/atom+xml" href="">' +
          '<link rel="alternate" type="application/atom+xml" href="./b">' +
          '<link rel="alternate" type="application/atom+xml" href="../c">' +
          '<link type="application/atom+xml" href="http://other.com/d">' +
          '</head></html>',
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

test('returns default links', () => {
  equal(
    loaders.atom.getMineLinksFromText(
      createTextResponse('<!DOCTYPE html><html><head></head></html>', {
        url: 'https://example.com/news/'
      })
    ),
    ['https://example.com/atom']
  )
})

test('ignores default URL on RSS link', () => {
  equal(
    loaders.atom.getMineLinksFromText(
      createTextResponse(
        '<!DOCTYPE html><html><head>' +
          '<link rel="alternate" type="application/rss+xml" href="/rss">' +
          '</head></html>',
        {
          url: 'https://example.com/news/'
        }
      )
    ),
    []
  )
})

test('detects titles', () => {
  function check(
    text: string,
    expected: ReturnType<typeof loaders.atom.isMineText>
  ): void {
    equal(
      loaders.atom.isMineText(
        createTextResponse(text, {
          headers: new Headers({ 'Content-Type': 'application/rss+xml' })
        })
      ),
      expected
    )
  }

  check('<feed></feed>', '')
  check(
    '<?xml version="1.0" encoding="utf-8"?>' +
      '<feed xmlns="http://www.w3.org/2005/Atom">' +
      '<title>Test 2</title>' +
      '</feed>',
    'Test 2'
  )
  check('<unknown><title>No</title></unknown>', false)
})

test('parses posts', async () => {
  let task = createDownloadTask()
  equal(
    await loaders.atom.getPosts(
      task,
      'https://example.com/news/',
      createTextResponse(
        '<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">' +
          '<title>Feed</title>' +
          '<entry><title>1</title>' +
          '<link rel="alternate" href="https://example.com/1" />' +
          '<content>Full 1</content>' +
          '<id>1</id><summary>Post 1</summary></entry>' +
          '<entry><title>2</title><id>2</id>' +
          '<link rel="related" href="https://example.com/2" />' +
          '</entry>' +
          '<entry><title>3</title></entry>' +
          '</feed>',
        {
          headers: new Headers({ 'Content-Type': 'application/rss+xml' })
        }
      )
    ),
    [
      {
        full: 'Full 1',
        id: '1',
        intro: 'Post 1',
        title: '1',
        url: 'https://example.com/1'
      },
      {
        full: undefined,
        id: '2',
        intro: undefined,
        title: '2',
        url: undefined
      }
    ]
  )
})

test('loads text to parse posts', async () => {
  let task = createDownloadTask()
  let text = spyOn(task, 'text', async () =>
    createTextResponse(
      '<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">' +
        '<title>Feed</title>' +
        '<entry><title>1</title><id>1</id></entry>' +
        '</feed>',
      {
        headers: new Headers({ 'Content-Type': 'application/rss+xml' })
      }
    )
  )

  equal(await loaders.atom.getPosts(task, 'https://example.com/news/'), [
    {
      full: undefined,
      id: '1',
      intro: undefined,
      title: '1',
      url: undefined
    }
  ])
  equal(text.calls, [['https://example.com/news/']])
})

test.run()
