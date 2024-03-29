import { keepMount } from 'nanostores'
import { deepStrictEqual, equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'

import { addPost, deletePost, getPost, loadPost, loadPosts } from '../index.js'
import { cleanClientTest, enableClientTest } from './utils.js'

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  await cleanClientTest()
})

test('adds, loads and removes posts', async () => {
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

  await deletePost(id)
  deepStrictEqual(await loadPosts(), [])
})
