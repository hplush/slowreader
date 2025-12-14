import './dom-parser.ts'

import { loadValue } from '@logux/client'
import { equal } from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'

import {
  addPost,
  getPost,
  getPostContent,
  getPostIntro,
  getPostTitle,
  type OriginPost,
  testPost
} from '../index.ts'
import { cleanClientTest, enableClientTest } from './utils.ts'

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  await cleanClientTest()
})

function longText(): string {
  return 'a'.repeat(5000)
}

test('has helper to load post', async () => {
  let id = await addPost(testPost({ title: 'Test Post' }))
  let post = await loadValue(getPost(id))
  equal(post?.title, 'Test Post')
})

test('loads post title', () => {
  let origin = {
    media: [],
    originId: 'id',
    publishedAt: 1763900785
  } satisfies OriginPost

  equal(getPostTitle(origin), '11/23/2025')
  equal(getPostTitle({ ...origin, publishedAt: undefined }), 'id')
  equal(getPostTitle({ ...origin, full: '&lt;tag&gt; <img />' }), '<tag>')
  equal(getPostTitle({ ...origin, full: 'b', intro: 'a<img />' }), 'a')
  equal(
    getPostTitle({ ...origin, full: 'b', intro: 'a', title: '<b>z</b>' }),
    'z'
  )
  equal(
    getPostTitle({
      ...origin,
      intro:
        'Pretty long intro which container few sentences. ' +
        'But sentences is small enough to be cut by them'
    }),
    'Pretty long intro which container few sentences. …'
  )
  equal(
    getPostTitle({
      ...origin,
      intro:
        'Is it pretty long intro which container few sentences? ' +
        'But sentences is small enough to be cut by them'
    }),
    'Is it pretty long intro which container few sentences? …'
  )
  equal(
    getPostTitle({
      ...origin,
      intro:
        'Very long body without sentences to be able to cut ' +
        'the text in the middle of them for better readability'
    }),
    'Very long body without sentences to be able ' +
      'to cut the text in the middle of…'
  )
  equal(
    getPostTitle({
      ...origin,
      intro:
        '文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本' +
        '文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本' +
        '文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本'
    }),
    '文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本' +
      '文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本' +
      '文本文本文本文本文本文本…'
  )
  equal(
    getPostTitle({
      ...origin,
      intro:
        '文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本' +
        '文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本'
    }),
    '文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本' +
      '文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本'
  )
  equal(
    getPostTitle({
      ...origin,
      title:
        'Pretty long intro which container few sentences. ' +
        'But sentences is small enough to be cut by them.'
    }),
    'Pretty long intro which container few sentences. ' +
      'But sentences is small enough to be cut by them.'
  )
})

test('loads post content', () => {
  let origin = { media: [], originId: '' } satisfies OriginPost

  equal(getPostContent(origin), '')
  equal(getPostContent({ ...origin, intro: 'a' }), 'a')
  equal(getPostContent({ ...origin, full: 'b', intro: 'a' }), 'b')

  equal(getPostIntro(origin), '')
  equal(getPostIntro({ ...origin, full: 'short' }), 'short')
  equal(getPostIntro({ ...origin, full: 'short', intro: 'intro' }), 'intro')
  equal(
    getPostIntro({ ...origin, full: longText() }),
    longText().slice(0, 80) + '…'
  )
})
