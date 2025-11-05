import '../dom-parser.ts'

import { equal } from 'node:assert/strict'
import { test } from 'node:test'

import { parseRichTranslation, sanitizeDOM } from '../../index.ts'

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
