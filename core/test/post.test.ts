import { equal } from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'

import {
  getPostContent,
  getPostIntro,
  getPostTitle,
  type OriginPost
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

test('loads post title', () => {
  let origin = {
    media: [],
    originId: 'id',
    publishedAt: 1763900785
  } satisfies OriginPost

  equal(getPostTitle(origin), '11/23/2025')
  equal(getPostTitle({ ...origin, publishedAt: undefined }), 'id')
  equal(getPostTitle({ ...origin, full: 'b<img />' }), 'b')
  equal(getPostTitle({ ...origin, full: 'b', intro: 'a<img />' }), 'a')
  equal(
    getPostTitle({ ...origin, full: 'b', intro: 'a', title: '<b>z</b>' }),
    'z'
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
  equal(getPostIntro({ ...origin, full: longText() }), longText())
})
