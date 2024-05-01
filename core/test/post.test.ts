import { keepMount } from 'nanostores'
import { deepStrictEqual, equal, ok } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'

import {
  addPost,
  changePost,
  deletePost,
  getPost,
  getPostContent,
  getPostIntro,
  loadPost,
  loadPosts,
  type OriginPost,
  processOriginPost
} from '../index.js'
import { cleanClientTest, enableClientTest } from './utils.js'

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  await cleanClientTest()
})

function longText(): string {
  return 'a'.repeat(1000)
}

test('adds, loads, changes and removes posts', async () => {
  deepStrictEqual(await loadPosts(), [])

  let id = await addPost({
    feedId: '1',
    media: [],
    originId: '1',
    publishedAt: 0,
    reading: 'fast'
  })
  equal(typeof id, 'string')
  let added = await loadPosts()
  equal(added.length, 1)
  equal(added[0]!.reading, 'fast')

  deepStrictEqual(await loadPost(id), added[0])

  let post = getPost(id)
  keepMount(post)
  equal(post.get(), added[0])

  await changePost(id, { reading: 'slow' })
  let changed = await loadPost(id)
  equal(changed!.reading, 'slow')

  await deletePost(id)
  deepStrictEqual(await loadPosts(), [])
})

test('processes origin post', () => {
  let origin = {
    media: [],
    originId: '1'
  } satisfies OriginPost

  ok(processOriginPost(origin, 'feed', 'fast').publishedAt >= Date.now() - 100)
  equal(processOriginPost(origin, 'feed', 'fast').feedId, 'feed')
  equal(processOriginPost(origin, 'feed', 'fast').reading, 'fast')
  equal(typeof processOriginPost(origin, 'feed', 'fast').id, 'string')

  equal(
    processOriginPost({ ...origin, publishedAt: 200 }, 'feed', 'fast')
      .publishedAt,
    200
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
  equal(getPostIntro({ ...origin, full: longText() }), '')
})
