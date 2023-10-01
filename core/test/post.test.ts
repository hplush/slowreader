import { loadValue } from '@logux/client'
import { keepMount } from 'nanostores'
import { deepStrictEqual, equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'

import { addPost, deletePost, getPost, getPosts } from '../index.js'
import { cleanClientTest, enableClientTest } from './utils.js'

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  await cleanClientTest()
})

test('adds, loads and removes posts', async () => {
  deepStrictEqual((await loadValue(getPosts())).list, [])

  let id = await addPost({
    feedId: '1',
    media: [],
    originId: '1',
    reading: 'fast'
  })
  equal(typeof id, 'string')
  let added = (await loadValue(getPosts())).list
  equal(added.length, 1)
  equal(added[0].reading, 'fast')

  let post = getPost(id)
  keepMount(post)
  equal(post.get(), added[0])

  await deletePost(id)
  let deleted = (await loadValue(getPosts())).list
  equal(deleted.length, 0)
})
