import '../dom-parser.ts'

import { equal } from 'node:assert/strict'
import { describe, test } from 'node:test'

import { parseRichTranslation, sanitizeDOM, truncateHTML } from '../../index.ts'

describe('html', () => {
  test('sanitizes HTML', () => {
    equal(
      (
        sanitizeDOM(
          '<script>alert("XSS")</script>' +
            '<b>Safe</b>' +
            '<form></form>' +
            '<iframe//src=jAva&Tab;script:alert(3)>',
          undefined
        ) as HTMLElement
      ).innerHTML,
      '<b>Safe</b>'
    )
  })

  test('resolves relative href to absolute URL', () => {
    equal(
      (
        sanitizeDOM(
          '<a href="./page">Link</a>',
          'https://example.com/base/'
        ) as HTMLElement
      ).innerHTML,
      '<a href="https://example.com/base/page">Link</a>'
    )
  })

  test('resolves relative src to absolute URL', () => {
    equal(
      (
        sanitizeDOM(
          '<img src="image.png">',
          'https://example.com/posts/1/'
        ) as HTMLElement
      ).innerHTML,
      '<img src="https://example.com/posts/1/image.png">'
    )
  })

  test('keeps absolute URLs unchanged', () => {
    equal(
      (
        sanitizeDOM(
          '<a href="https://other.com/page">Link</a>',
          'https://example.com/'
        ) as HTMLElement
      ).innerHTML,
      '<a href="https://other.com/page">Link</a>'
    )
  })

  test('removes elements with relative URLs when url is undefined', () => {
    equal(
      (
        sanitizeDOM(
          '<p>Text <a href="/path">Link</a> more</p>',
          undefined
        ) as HTMLElement
      ).innerHTML,
      '<p>Text  more</p>'
    )
    equal(
      (
        sanitizeDOM(
          '<p>Text <img src="image.png"> more</p>',
          undefined
        ) as HTMLElement
      ).innerHTML,
      '<p>Text  more</p>'
    )
  })

  test('keeps absolute URLs with other protocols unchanged', () => {
    equal(
      (
        sanitizeDOM(
          '<a href="mailto:test@example.com">Email</a>',
          'https://example.com/'
        ) as HTMLElement
      ).innerHTML,
      '<a href="mailto:test@example.com">Email</a>'
    )
  })

  test('converts translation Markdown', () => {
    equal(
      parseRichTranslation('- list\n- items\n\n<b>A</b>B'),
      '<p><ul><li>list</li>\n<li>items</li></ul></p><p>AB</p>'
    )
  })

  test('converts links in translation', () => {
    equal(
      parseRichTranslation('[Link] to example', 'https://example.com'),
      '<a href="https://example.com">Link</a> to example'
    )
  })

  test('converts ** to strong', () => {
    equal(
      parseRichTranslation('This is **bold** text'),
      'This is <strong>bold</strong> text'
    )
  })

  test('combines list with strong syntax', () => {
    equal(
      parseRichTranslation('* **item one**\n* item **two**'),
      '<ul><li><strong>item one</strong></li>\n<li>item <strong>two</strong></li></ul>'
    )
  })

  test('truncates HTML at character limit', () => {
    equal(truncateHTML('<p>Short text</p>', 0, 50), '<p>Short text</p>')
  })

  test('truncates HTML and closes tags', () => {
    equal(
      truncateHTML(
        '<p>This is a very long paragraph that should be truncated</p>',
        10,
        25
      ),
      '<p>This is a very long …</p>'
    )
  })

  test('truncates HTML at paragraph boundary', () => {
    equal(
      truncateHTML(
        '<p>First paragraph with enough text to be over min.</p><p>Second paragraph that will exceed the max limit.</p>',
        40,
        80
      ),
      '<p>First paragraph with enough text to be over min.</p><p>…</p>'
    )
  })

  test('handles nested tags when truncating at paragraph', () => {
    equal(
      truncateHTML(
        '<div><p>First paragraph text here.</p><p>Second paragraph with <strong>bold</strong> text.</p></div>',
        20,
        30
      ),
      '<div><p>First paragraph text here.</p><p>…</p></div>'
    )
  })
})
