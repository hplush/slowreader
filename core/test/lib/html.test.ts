import '../dom-parser.ts'

import { equal } from 'node:assert/strict'
import { test } from 'node:test'

import { parseRichTranslation, sanitizeDOM, truncateHTML } from '../../index.ts'

test('sanitizes HTML', () => {
  equal(
    (
      sanitizeDOM(
        '<script>alert("XSS")</script>' +
          '<b>Safe</b>' +
          '<form></form>' +
          '<iframe//src=jAva&Tab;script:alert(3)>'
      ) as HTMLElement
    ).innerHTML,
    '<b>Safe</b>'
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
