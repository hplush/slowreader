import './dom-parser.ts'

import { loadValue } from '@logux/client'
import { deepEqual, doesNotMatch, equal, match } from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'

import {
  addPost,
  getPost,
  getPostContent,
  getPostIntro,
  getPostTitle,
  testPost
} from '../index.ts'
import { cleanClientTest, enableClientTest } from './utils.ts'

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  await cleanClientTest()
})

function truncateBetweenParagraphs(text: string): void {
  let result = getPostIntro({
    full: text,
    originId: 'id'
  })
  equal(result[1], true)
  match(result[0], /<p>…<\/p>$/)
}

function truncateBetweenSentences(text: string): void {
  let result = getPostIntro({
    full: text,
    originId: 'id'
  })
  equal(result[1], true)
  match(result[0], /[.?] …<\/p>/)
}

test('has helper to load post', async () => {
  let id = await addPost(testPost({ title: 'Test Post' }))
  let post = await loadValue(getPost(id))
  equal(post?.title, 'Test Post')
})

test('loads post title', () => {
  equal(getPostTitle({ originId: 'id', publishedAt: 1763900785 }), '11/23/2025')
  equal(getPostTitle({ originId: 'id', publishedAt: undefined }), 'id')
  equal(getPostTitle({ full: '&lt;tag&gt; <img />', originId: 'id' }), '<tag>')
  equal(getPostTitle({ full: 'b', intro: 'a<img />', originId: 'id' }), 'a')
  equal(
    getPostTitle({ full: 'b', intro: 'a', originId: 'id', title: '<b>z</b>' }),
    'z'
  )
  equal(
    getPostTitle({
      intro:
        'Pretty long intro which container few sentences. ' +
        'But sentences is small enough to be cut by them',
      originId: 'id'
    }),
    'Pretty long intro which container few sentences. …'
  )
  equal(
    getPostTitle({
      intro:
        'Is it pretty long intro which container few sentences? ' +
        'But sentences is small enough to be cut by them',
      originId: 'id'
    }),
    'Is it pretty long intro which container few sentences? …'
  )
  equal(
    getPostTitle({
      intro:
        'Very long body without sentences to be able to cut ' +
        'the text in the middle of them for better readability',
      originId: 'id'
    }),
    'Very long body without sentences to be able ' +
      'to cut the text in the middle of …'
  )
  equal(
    getPostTitle({
      intro:
        '文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本' +
        '文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本' +
        '文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本',
      originId: 'id'
    }),
    '文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本' +
      '文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本' +
      '文本文本文本文本文本文本…'
  )
  equal(
    getPostTitle({
      intro:
        '文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本' +
        '文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本',
      originId: 'id'
    }),
    '文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本' +
      '文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本'
  )
  equal(
    getPostTitle({
      originId: 'id',
      title:
        'Pretty long intro which container few sentences. ' +
        'But sentences is small enough to be cut by them.'
    }),
    'Pretty long intro which container few sentences. ' +
      'But sentences is small enough to be cut by them.'
  )
})

test('loads post content', () => {
  equal(getPostContent({ originId: 'id' }), '')
  equal(getPostContent({ intro: 'a', originId: 'id' }), 'a')
  equal(getPostContent({ full: 'b', intro: 'a', originId: 'id' }), 'b')

  deepEqual(getPostIntro({ originId: 'id' }), ['', false])
  deepEqual(getPostIntro({ full: 'short', originId: 'id' }), ['short', false])
  deepEqual(getPostIntro({ full: 'short', intro: 'intro', originId: 'id' }), [
    'intro',
    true
  ])
  deepEqual(getPostIntro({ full: 'a'.repeat(600), originId: 'id' }), [
    'a'.repeat(500) + '…',
    true
  ])
})

test('truncate post full body 1', () => {
  truncateBetweenParagraphs(
    `\n<p>Xxx xxx xxx xxxxx xxx xxxxx. Xxx, xxx xxxxxxx, xxxxx xxx xx xxxxxxxx xxxx xxxx xxx xxxxxxxx. Xxx xxxx xxxxx xx xxxxx xxxxxxxxxxxx xxxxxx xx xxxxxxx xxxxxxx. Xx xxxxx xxxxx, xx xx xxxxxxxxxx (xxxxxxxx, xx "Xxxxx" xxx "Xxxxx") x xx xxxx xxxxx xxxxxxx xxxxxxxx.</p>\n<p>Xxxxxxx, xxx xxxxx xxxx, xxx xxxxxxx xx xxxxxxxx xxx xxxxxx xx xxxxxxx xxxxxxx xxxxxx, x xxxxx xxxxxxxx xxxxxxx xxxxx xxxxxxxxxxxx. Xxxxx, xxxxx, xxx xx xx xxxx xxxxxx. Xxxx-xxxx xx xxx xx Xxxxxx xxxxx xxxxxx xxxxxx, xxx xx xxxxxxxx xxxxxxxx, xxxxxxxx, xx xxx xx Xxxxxx.</p>\n<p>Xx xxxx xxxx xxxxx Xxxxxxxxxxx xxxx xxxx xxxxxxxxxxxx: xx xxx xxx Xxxxxxxxxxx xxxxxxxxxxx xx Xxxxx xxxxx, xxxxxx xxx xxxxx xxxxxx x xxxxxx xxx xxxxxxxxxx xxx xx Xxxxxxx.</p>\n<p>Xx-xxxxxx, xxxxxxx xxx xxx xxxxx, xxx xxx xxxx xxxxxxxxxxx. Xx-xxxxxxx, x xxxxxxxxxx xxxxx xxxxxx, xxx x xxxxx-xx xxxxx xxxxx, xxx xxxxxxxxxx xxxxxx xxx xxxxxxxx xx xxxxxxxxx xx xxxxxxx xxx xxx xxxxx obratno.</p>\n`
  )
})

test('truncate post full body 2', () => {
  truncateBetweenParagraphs(
    `\n<p>Xxx xxx xxx xxxxxxxx, x xxxxxxxx xxx xx xxxxxxxx "Xxxxx" x, xxxxxx, xxxxxxxxx xxx xxxxxx. Xxx xxxxxx! Xxxxx x xxx xx xxxxx xxxxx xx-xx xxxxxxx x xxx xxx xxxxxxxx xxx xxxxx xxxxxxx.</p>\n<p>Xxxxxx, xxxxxxx xxxx xxxxxxxxxxx — xxxxxxx xx x xxxx xxxxxx xxxx xxxxxxx? Xxx xxx xxxxxxx.</p>\n<p>Xxxx xx xxx, xxx "Xxxxx" — xxx xxxx xxxxxxxxxxx, x xx xxx xxxxxxx. Xxxxxxxx, xxx xxxxxxxxxxx xxxxx xxxxxxxxxxxxxx xx xxxxx xxxxxx. Xxx xxx xxxxxxx [xxxxx](xxxxx) xxx "Visually Interactive Object-oriented Language and Application".</p>\n<p>Xxxxxxx xx xxxxxxx xxxxxxxx "ViolaWWW". Xx xxxxxxx xxx xxxx xxxxx xxxxxxxxxx, xx xxxxxx xxxxxxxxxxx xxxxxxx, xxxxxx x xxxxx xxxxx xxxxxxxx xxx "Xxxxx". X xxx xxxxxxxxxxx, xxx xxxxxxx xx xxx xxxxxx xxx xxx xxxxxxxx xx xxxxx xx xxxx, xxxxx xx xxx xxx xxxxx xxxxxx xxxxxxx.</p>\n<p>X xxxxxx, xx xxx xxxxx xxx xxxxxxx xxxx — xxxxxxxx, xx xxxxxx "Internet World Magazine" xx xxxxxx 1995 xxxx xx xxx xxxxxxxx "Xxxxx", xxxxxx xxx xx xxxxxxxx.</p>\n<div class="e2-text-picture">\n<img src="https://example.com/xxx@2x.webp" width="750" height="300" alt="" />\n<div class="e2-text-caption">Xxxxxx xx xxxxxx "Internet World Magazine" xx xxxxxx 1995 xxxx, xxxxxxx 36</div>\n</div>\n`
  )
})

test('truncate post full body 4', () => {
  truncateBetweenParagraphs(
    `<img src='/images/blog/2025-12-xxxx-xxxxx/xxx.webp' style='border: 0;box-shadow: none;' alt="Xxx xxxxxxx, xxxx xxxxxx: xxxxxxxxxx x xxxxxxx xxxx xxx xxxxxxxxxxx">\n<p>Xx xxx'xx xxxx xx xxxx xx x xxxxx xxxx xxxxx xxxx xxxx Xxxx Xxxxxxxx, <em>xxxx, x xxxx xxxx xxx xxxxxxx xxx xxx</em>. <a href="https://works-with.home-assistant.io/">Xxxxx xxxx Xxxx Xxxxxxxx</a> xx xxx xxxxxxxxxxx xxxxxxx xxxx xxxxxx xxxxxxx xxxx xxxxxxxxxxx xxx xxxxxxx, xxx xxxx xxxxxx xxxx xxxx xx.</p>\n<p>Xxx xxx xxxx xxxx xxx Xxxx Xxxxxxxx xxxxxxx xxx xxxxxxxxx 12 xxxxxxx xxxxxx 12 xxxxxx? Xxxx'x xxxx xxxx xxxx xxxxxxxxx xx xxx xxx xxxx xxxxx xxx <a href="/blog/2022/07/12/partner-program/">xxxxxxx xxxxxxx xx 2022</a>! Xxx xxxx xxxx xx xxxxxxx xx xxxxxx xxxx xxxx (<a href="https://tests-test.xxxx-xxxxxxxxx.io/certified-products/">xxxxxx, xx xxxx xx xxxxxxxxxxx</a>). Xx xxxx xxx xxxx xxxxxx xxxx xxxx xxx, x xxx xx xxxxxxxxxxx xxxxxx xxxx xxxx xxxxxxxx xxxxxx xxx xxxxxx.</p>`
  )
})

test('truncate post full body 5', () => {
  truncateBetweenSentences(
    `<p>Xx xxxx xxxxxxx xxx, x xxxx xxxxxxxxx xx <a href="/blog/2021/03/07/new-pet-project/en/">xxxxxxx xxxx</a> xx xxx xxxxx xxxxx xx xxx xxxxxx <em>xx xxx</em>, xxxxx xxxxx x xxxx xxxxxxx xx xxxxxx xx xx. Xxx xxxx, xxx xxxxxx xxxxx… Xx xxx xxxxxxx xxxxxx xx xxxxx xxxxxxxxxxxx xx xxxxx xxxx xx xxx xx xx xxxxxxxxxxxx. Xx x xxx xxxxx xxx, xxxxx xxx xxxxxx xxx xxx xxxxxxxxx xxx x xxxx, x xxxxxx xxxxx xxxxxxxx xxx xxxxx xx xxxxxxx xx xxx xxxx xxx xxxxxx xx xxxxxx xxxxxxxxxxxxxx xxxxxxx. Xxx xxxxxxx xxx xxxx xxxxxxx xxxx x xxx xx x xxxxx xxxxxxxxx xxxx xxxxx xxxxxx xxxxx xxx xxxxxxx xxx xxxxxxx xxxxx xx xxxxx <em>xx xxx xxxx</em>.</p>`
  )
})

test('truncate post full body 6', () => {
  doesNotMatch(
    getPostIntro({
      full: `\n<p>Xxx xxxx xxxxx xx xxx xxxxxxx "Xxx-xxxxxx". X xxxxx xxxxx xxxx xxxxxxx xx 250 xxxxxxxxxxx, xxx xxx xxxx xxxxxxx.</p>\n<p>X xxxxxxxx xxxxxxxxx xxxxx x xxxxxxx xxxxxxxxx xxxxxxxx Xxxxx — xxxx, xxxxxxx xxx xx xxx xx xxxxxxxxx. Xxxxx xxxxxxx xxxxxxxxxxxxxx x xxxxxxxxxxx xx xxxxxxx xxxxxxxxxx <a href="https://example.ru/all/video-iz-1991-goda/">xxxxx xxxxxxxxxxxx xxxx</a>, xxx Xxxxx xxxxx xxxx xxxxxx x xxxxx xxxxxxxxx xxxxxxx.</p>\n<p>Xxxxx x xx xxxxxxxxxxx, xxxxx xxx xxxxxxxxxxxx, xx x xxxxxx xxxxx xxxxx xxxxxxx:</p>\n<blockquote>\n<p>Xx xxxx xxxxxxx x xxxxxx xx xxxxx xxx xxx. Xxxx xxxxxxxxx xxx xxxxxxxxxxx x xxxxxx xxxxxxxxxxxxx xxx. X xxxxxxxx xxxxxx xxxxx xxxx, xxxx xx xxxxxxx x xxx xxxxxxxxxx, xxxxxxx xxxxx xxxxxxxxxxx.</p>\n</blockquote>\n`,
      originId: 'id'
    })[0],
    /<blockquote>$/
  )
})

test('truncate post full body 7', () => {
  truncateBetweenParagraphs(
    `\n<p>"Xxxxx", xxxxxxxx, xxxxxxx xxxxx xxxx xxxxxxxxx xxxx — xx xxxxxxxx xxx xxxxxx x xxxxxx xxxxxxxx xxx xxxx xxxxxxx xx xxxxxxx xx xxx xxxxxxxxxx. Xxxxx xxxxx, xxxxxxxxxxxxx xxx xxx xx xxx xxx xxx xx xxxxxxx xxxx, x xxxxxxx xxxxxxxxx xxxxx — xxxxxxxxxxxxx xxxxxxxxx xxxxxxx xxxxxxxxx.</p>\n<p>Xxxxxxx xxxxxxxx xxxx xxxxxxxxxx xxxxx xxxxxx, xxxxxx x xxxxxx xxxxxxx xxxx xxxxxxx. X "Xxxxx" xxx xxx xxx xxxxxxxxx — "Hot List", xxxxxxxxxxx xxxxxxx xxxxxxxxx xxxxxx xxxxxxx. Xx "Hot List" xxxx xxxxxx x xxxxxxxxxxx. X xxxxxxx xx xxxx, xxxxxxx xxxxxxxxxxx xxxxxxx xxxxx x xxx xx xxxxxxxxx xxxxxxxxx, xxxxxxxx xxxxxxxxx xxx xxx, xxx xxxxxx xxxxxxxx xxxxxxxxxxxx.</p>\n`
  )
})

test('truncate post full body 8', () => {
  truncateBetweenParagraphs(
    `\n<p>Xxxxx xxxxxxx xx xxxxxxxx xxxxx XXX. Xxxxx xxxx xxxxxxxxx, x x xxx xxxxxxx: xxxxxxx xxxxxx xxxxxxxxxxx xxxx xxxxxxxx xxxxxxxxxxxx xxxxxx x x xxxxxxxx xxxxxxx xxxxx xxx, xxxx xxx xxxxxx, xxxxxxxxx xxxxxxx xx xxx xxxxx.</p>\n<p>Xxxxxxxxxxxx xxxxxxxxxxx xx xxxx — xxx xx xxxxxxxxx xxxxx, xxx xxxxxx xxxxxx xxxxxxxx, xxxxxx xxxxxx xxxxxxxxx xxxxxx x xx xxxxxx xxxxx. Xxxxx xxx xxxx xxxxxxxxxxxx xxx xxxxxxxxxx xxxxxxxxx.</p>\n<p>Xxxx xxxxxxx xxxxx xx xxxxxxxxx — xxxxxxxxx xxxxxxx xx xxx xxxx xxxxx, xxxxxx xxxxxxx xx xxx x xxxx xxxxxxxxxx xxxxx xxxx. X xxxxxxx xxxxx xxxxxx xx xxxxxxx xxxxx, x xxx xxx xxxxxx, xx xxxxxxx xx xxxxx xxxx xxxxxxxxx xxxxxxx.</p>`
  )
})

test('truncate post full body 9', () => {
  truncateBetweenParagraphs(
    `\n<p>Xxxx x xxx xxxxxxxxx xxxxxxxxx xxx xxxxxxxxx, xxxxxxxxx xxxxxx xxxxxxx xxx xxx xxxx-xx xxxx xxxxxxx — xxxxxxxx, xxxx xxx xxxxxxxxxxxxxxx (x xxxx xxxxx xxxxxxxxxx xx xxxxxxx) xx xxx xxxxxx xxxxxxxx xxxx xxxxx xxxx-xxxxxxxxxx <i>Jikes</i>, xxxxxxxx xx Xx++. Xxxxxx xxxxxxxxx xxxxxxxx <a href="https://github.com/xxxxx/xxxx"><i>XXXX</i></a> x xxxxxxxxxxx Xxxx xxxxxx 5, 6 x 7.</p>\n<p>Xxx xxxxx xxxx xxxxx, xxxxxxxx, xxx "xxxxxxxxxxx" — xxxxx xxxx x "xxxx", xx xxxxxxxxxxx xxxxxx xxxx-xxxxxxxxx + xxxxxxx + xxxxxxxxxxx, xxx xxxxxxxxx xxxxxxxx xxxxxxxxxx.</p>\n<p>X xxxxxxx x xxxx xxxxxx xxxx xxxxxxxxx. Xxxxx xx xxxxxxxxx, xx xxxxxxx xxxxxxxxx xxxxx xxxxxxxxx x xxxxxxxx. X xxxxxx, xxxx xxxxx x xxx xxxxxxxxxx.</p>\n<p>Xxxxxx, xx xxxx xxxxxxxx xxxxxx <i>XXXX</i> xxxxx x xxxxxxx xxx xxxxx xxxxxxx <tt>rt.jar</tt> (xxx xxxxxxx xxxxxx xxxxxxxxxxx xxxxxxxxxxxx), xx xxx xxxxxxxxx xxxxxx, xxxxx xxxxxxxxxxx xxx xxxxx.</p>\n<p>X xxxxxx, xxxxxx xxxxx: xxxxxxx xxxxxxxxxx, xx xxx xx xxxxx <i>XXXX</i>, xxxxx xxxxxxxxx, xxxxx x xxxxxxxxxxx, xxxxxx xxxxxxxx xxxxxxxxxxx xx <tt>class</tt> xxxxxxx xxxxx. X xxxx x xxxxxxx xxxxxxxxxxx Xxxxx.</p>\n<div class="e2-text-picture">\n<img src="https://example.ru/pictures/2025.12.06.1@2x.webp" width="1000" height="562" alt="" />\n</div>\n<p><i>Xxxxxxxxx xxxxxxxxx</i>: xx xxxxx xxxx xxx xxxxxxx, xxxxx-xx xxxxx xxxxx:</p>\n<div class="e2-text-picture">\n<img src="https://example.ru/pictures/2025.12.07@2x.webp" width="456" height="220" alt="" />\n</div>\n`
  )
})

test('truncate post full body with br', () => {
  truncateBetweenParagraphs(
    `<br />Xxxx, xx xxxxxxx xxxxx xx xxxxxxxxx xxxxxxx xxxxxxxxxxxxxxx xx xxxxxxxxx xxxxxxxxx.<br />Xxxxxxxxx, xxx xxx xxxx xxxxxx xxxxxxxxx xxxxxxx xxxx xxxx-xx xxxxxxxxxx xxxxxxxx xxxx xx xxxxxxx xxxxxxxxx xxxxxxx - XX-21.<br />Xxxxxxxx xxxxxxxxxx xxxx-xxxxxxx x ???????? x xxxxxxxx, xxx ????????? ????????? ?????????? ????????????? ? ????????? ????????????.<br />X ????????? ????????? ?????? ??????? ????? ????????? ?????? ?????????? ?????? ?????? ???? ?????????? ??????????.<br /><br />?????????, ???????? ???????? XX-21 - ??? ?????? ?? ??????? Xxx xxxx xxxxxx xxxxxxx ??????? ????????????? ???????????? ????????????.<br /><br />`
  )
})

test('truncate post full body with <style>', () => {
  let result = getPostIntro({
    full: `<style>${'*{padding:0;}'.repeat(50)}</style><p>X xxx xxxxxxx xxxxx, xxx xxxx WebGL, xxxxxxxxxxx, xxxxx xxxxxxxx xxxx xxxxxxxxx xxxxxxxxxxxxx xxxxxxxxxx xx xxxxxx, xxx xxxxxxx lastwrd.</p>`,
    originId: 'id'
  })
  match(result[0], /lastwrd/)
  equal(result[1], false)
})
