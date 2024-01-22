import './dom-parser.js'

import { equal } from 'node:assert'
import { test } from 'node:test'

import { parseLink, parseRichTranslation, sanitizeHTML } from '../index.js'

test('sanitizes HTML', () => {
  equal(
    sanitizeHTML(
      '<script>alert("XSS")</script>' +
        '<b>Safe</b>' +
        '<form></form>' +
        '<iframe//src=jAva&Tab;script:alert(3)>'
    ),
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
    parseLink('[Link] to example', 'https://example.com'),
    '<a href="https://example.com">Link</a> to example'
  )
})
