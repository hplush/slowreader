import { equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'

import { getPostContent, getPostIntro, type OriginPost } from '../index.ts'
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

test('loads post content', () => {
  let origin = { media: [], originId: '' } satisfies OriginPost

  equal(getPostContent(origin), '')
  equal(getPostContent({ ...origin, intro: 'a' }), 'a')
  equal(getPostContent({ ...origin, full: 'b', intro: 'a' }), 'b')

  equal(getPostIntro(origin), '')
  equal(getPostIntro({ ...origin, full: 'short' }), 'short')
  equal(getPostIntro({ ...origin, full: 'short', intro: 'intro' }), 'intro')
  equal(getPostIntro({ ...origin, full: longText() }), '')
})
