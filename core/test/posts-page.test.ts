import { deepStrictEqual } from 'node:assert'
import { test } from 'node:test'

import { createPostsPage, type OriginPost } from '../index.js'

const POST1: OriginPost = {
  full: '1',
  id: '1',
  media: []
}

const POST2: OriginPost = {
  full: '2',
  id: '2',
  media: []
}

test('works with cached posts without next page', () => {
  let posts = createPostsPage([POST1], undefined)
  deepStrictEqual(posts.get(), {
    hasNext: false,
    isLoading: false,
    list: [POST1]
  })

  posts.nextPage()
  deepStrictEqual(posts.get(), {
    hasNext: false,
    isLoading: false,
    list: [POST1]
  })
})

test('works without posts', async () => {
  let posts = createPostsPage(undefined, async () => {
    return [[POST1], async () => [[POST2], undefined]]
  })
  deepStrictEqual(posts.get(), {
    hasNext: true,
    isLoading: true,
    list: []
  })

  await posts.loading
  deepStrictEqual(posts.get(), {
    hasNext: true,
    isLoading: false,
    list: [POST1]
  })

  posts.nextPage()
  deepStrictEqual(posts.get(), {
    hasNext: true,
    isLoading: true,
    list: [POST1]
  })

  await posts.loading
  deepStrictEqual(posts.get(), {
    hasNext: false,
    isLoading: false,
    list: [POST1, POST2]
  })

  posts.nextPage()
  deepStrictEqual(posts.get(), {
    hasNext: false,
    isLoading: false,
    list: [POST1, POST2]
  })
})

test('is ready for double calls', async () => {
  let posts = createPostsPage(undefined, async () => {
    return [[POST1], async () => [[POST2], undefined]]
  })
  posts.nextPage()
  await posts.loading
  deepStrictEqual(posts.get(), {
    hasNext: true,
    isLoading: false,
    list: [POST1]
  })

  posts.nextPage()
  posts.nextPage()
  deepStrictEqual(posts.get(), {
    hasNext: true,
    isLoading: true,
    list: [POST1]
  })

  await posts.loading
  deepStrictEqual(posts.get(), {
    hasNext: false,
    isLoading: false,
    list: [POST1, POST2]
  })
})

test('works with cached posts with next page loader', async () => {
  let posts = createPostsPage([POST1], async () => {
    return [[POST2], undefined]
  })
  deepStrictEqual(posts.get(), {
    hasNext: true,
    isLoading: false,
    list: [POST1]
  })

  posts.nextPage()
  deepStrictEqual(posts.get(), {
    hasNext: true,
    isLoading: true,
    list: [POST1]
  })

  await posts.loading
  deepStrictEqual(posts.get(), {
    hasNext: false,
    isLoading: false,
    list: [POST1, POST2]
  })
})
