import { equal } from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  parseDocument,
  parseRichTranslation,
  sanitizeDOM,
  truncateDOM
} from '../../index.ts'
import { setupNodeDom } from '../utils.ts'

setupNodeDom()

function truncate(html: string, min: number, max: number): string {
  let body = parseDocument(html).body
  truncateDOM(body, min, max)
  return body.innerHTML
}

function sanitize(html: string): string {
  return sanitizeDOM(html).innerHTML
}

describe('html', () => {
  test('sanitizes HTML', () => {
    equal(
      sanitize(
        '<script>alert("XSS")</script>' +
          '<b>Safe</b>' +
          '<form></form>' +
          '<iframe//src=jAva&Tab;script:alert(3)>'
      ),
      '<b>Safe</b>'
    )
  })

  test('keeps only attributes of the content', () => {
    equal(
      sanitize(
        '<figure style="position: relative" class="image" id="menu">' +
          '<img src="https://example.com/a.jpg" alt="A" width="10" ' +
          'style="position: absolute" data-id="1" aria-hidden="true" ' +
          'background="https://example.com/b.jpg" tabindex="0">' +
          '</figure>' +
          '<p popover="auto" role="button" name="x">' +
          '<a href="https://example.com/" title="B" ' +
          'popovertarget="menu" commandfor="menu" command="show-modal">' +
          'Link</a></p>'
      ),
      '<figure><img src="https://example.com/a.jpg" alt="A" width="10" ' +
        'loading="eager" decoding="async">' +
        '</figure><p><a href="https://example.com/" title="B">Link</a></p>'
    )
  })

  test('keeps picture sources', () => {
    equal(
      sanitize(
        '<picture><source srcset="https://example.com/dark.avif" ' +
          'type="image/avif" media="(prefers-color-scheme: dark)">' +
          '<img src="https://example.com/a.jpg"></picture>'
      ),
      '<picture><source srcset="https://example.com/dark.avif" ' +
        'type="image/avif" media="(prefers-color-scheme: dark)">' +
        '<img src="https://example.com/a.jpg" loading="eager" ' +
        'decoding="async"></picture>'
    )
  })

  test('keeps absolute URLs', () => {
    equal(
      sanitize(
        '<a href="https://other.com/page">Link</a>' +
          '<a href="mailto:test@example.com">Email</a>' +
          '<img srcset="https://example.com/a.jpg 1x, ' +
          'https://example.com/b.jpg 2x">'
      ),
      '<a href="https://other.com/page">Link</a>' +
        '<a href="mailto:test@example.com">Email</a>' +
        '<img srcset="https://example.com/a.jpg 1x, ' +
        'https://example.com/b.jpg 2x" loading="eager" decoding="async">'
    )
  })

  test('removes relative URLs', () => {
    equal(
      sanitize(
        '<p>Text <a href="/path">Link</a> more</p>' +
          '<p>Text <img src="image.png"> more</p>' +
          '<img src="https://example.com/a.jpg" ' +
          'srcset="https://example.com/a.jpg 1x, b.jpg 2x">'
      ),
      '<p>Text  more</p><p>Text  more</p>' +
        '<img src="https://example.com/a.jpg" loading="eager" ' +
        'decoding="async">'
    )
  })

  test('removes hidden content and tracking pixels', () => {
    equal(
      sanitize(
        '<p>Text</p><p hidden>SEO</p>' +
          '<div style="color: red; display:none">Share</div>' +
          '<span style="VISIBILITY: hidden">Tracking</span>' +
          '<img src="https://example.com/t.gif" width="1" height="1">' +
          '<img src="https://example.com/a.gif" width="1" height="10">'
      ),
      '<p>Text</p><img src="https://example.com/a.gif" width="1" ' +
        'height="10" loading="eager" decoding="async">'
    )
  })

  test('prefixes IDs for footnotes', () => {
    equal(
      sanitize(
        '<p id="intro">Text<sup id="ref1"><a href="#fn1">1</a></sup>' +
          '<a href="#missing">A</a></p>' +
          '<ol><li id="fn1">Note <a href="#ref1">↩</a></li></ol>' +
          '<h2 id="cookie">Title</h2>'
      ),
      '<p>Text<sup id="user-content-ref1">' +
        '<a href="#user-content-fn1">1</a></sup></p>' +
        '<ol><li id="user-content-fn1">Note ' +
        '<a href="#user-content-ref1">↩</a></li></ol>' +
        '<h2 id="user-content-cookie">Title</h2>'
    )
  })

  test('sets media behavior', () => {
    equal(
      sanitize(
        '<video src="https://example.com/a.mp4" autoplay preload="auto">' +
          '<track src="https://example.com/a.vtt" kind="subtitles" ' +
          'srclang="en" label="EN" default></video>' +
          '<audio src="https://example.com/a.mp3" controls></audio>' +
          '<img src="https://example.com/a.jpg" loading="eager" ' +
          'fetchpriority="high">'
      ),
      '<video src="https://example.com/a.mp4" controls="" preload="none">' +
        '<track src="https://example.com/a.vtt" kind="subtitles" ' +
        'srclang="en" label="EN" default=""></video>' +
        '<audio src="https://example.com/a.mp3" controls="" ' +
        'preload="none"></audio>' +
        '<img src="https://example.com/a.jpg" loading="eager" ' +
        'decoding="async">'
    )
  })

  test('keeps table column groups, time, and translate', () => {
    equal(
      sanitize(
        '<table><colgroup span="2"><col span="1"></colgroup></table>' +
          '<p><time datetime="2026-10-02">Today</time> ' +
          '<code translate="no">npm</code></p>'
      ),
      '<table><colgroup span="2"><col span="1"></colgroup></table>' +
        '<p><time datetime="2026-10-02">Today</time> ' +
        '<code translate="no">npm</code></p>'
    )
  })

  test('converts translation Markdown', () => {
    equal(
      parseRichTranslation('- list\n- items\n\n<b>A</b>B'),
      '<ul><li>list</li>\n<li>items</li></ul><p>AB</p>'
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
    equal(truncate('<p>Short text</p>', 0, 50), '<p>Short text</p>')
  })

  test('truncates HTML and closes tags', () => {
    equal(
      truncate(
        '<p>This is a very long paragraph that should be truncated</p>',
        10,
        25
      ),
      '<p>This is a very long …</p>'
    )
  })

  test('truncates HTML at paragraph boundary', () => {
    equal(
      truncate(
        '<p>First paragraph with enough text to be over min.</p><p>Second paragraph that will exceed the max limit.</p>',
        40,
        80
      ),
      '<p>First paragraph with enough text to be over min.</p><p>…</p>'
    )
  })

  test('truncates HTML at double break', () => {
    equal(
      truncate(
        'Sentence one here.<br />\n<br />\nSecond part that is longer than limit',
        10,
        30
      ),
      'Sentence one here.<p>…</p>'
    )
  })

  test('truncates HTML inside inline tag', () => {
    equal(
      truncate(
        '<p>First sentence here.</p>' +
          '<p>Second <strong>part which is longer than the limit</strong></p>',
        10,
        30
      ),
      '<p>First sentence here.</p><p>…</p>'
    )
  })

  test('removes break left in the end by truncating', () => {
    equal(truncate('<p>12345</p><br />67890', 0, 5), '<p>12345</p>')
  })

  test('handles nested tags when truncating at paragraph', () => {
    equal(
      truncate(
        '<div><p>First paragraph text here.</p><p>Second paragraph with <strong>bold</strong> text.</p></div>',
        20,
        30
      ),
      '<div><p>First paragraph text here.</p><p>…</p></div>'
    )
  })
})
