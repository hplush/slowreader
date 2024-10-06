import { deepStrictEqual } from 'node:assert'
import { test } from 'node:test'

import { createPostsList, type OriginPost } from '../index.ts'

const POST1: OriginPost = {
  full: '1',
  media: [],
  originId: '1'
}

const POST2: OriginPost = {
  full: '2',
  media: [],
  originId: '2'
}

test('works with cached posts without next page', async () => {
  let posts = createPostsList([POST1], undefined)
  deepStrictEqual(posts.get(), {
    hasNext: false,
    isLoading: false,
    list: [POST1]
  })

  let promise = posts.next()
  deepStrictEqual(posts.get(), {
    hasNext: false,
    isLoading: false,
    list: [POST1]
  })
  deepStrictEqual(await promise, [])
})

test('works without posts', async () => {
  let posts = createPostsList(undefined, async () => {
    return [[POST1], async () => [[POST2], undefined]]
  })
  deepStrictEqual(posts.get(), {
    hasNext: true,
    isLoading: true,
    list: []
  })

  let next1 = await posts.loading
  deepStrictEqual(posts.get(), {
    hasNext: true,
    isLoading: false,
    list: [POST1]
  })
  deepStrictEqual(next1, [POST1])

  let promise2 = posts.next()
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
  deepStrictEqual(await promise2, [POST2])

  let promise3 = posts.next()
  deepStrictEqual(posts.get(), {
    hasNext: false,
    isLoading: false,
    list: [POST1, POST2]
  })
  deepStrictEqual(await promise3, [])
})

test('is ready for double calls', async () => {
  let posts = createPostsList(undefined, async () => {
    return [[POST1], async () => [[POST2], undefined]]
  })
  posts.next()
  await posts.loading
  deepStrictEqual(posts.get(), {
    hasNext: true,
    isLoading: false,
    list: [POST1]
  })

  let promise1 = posts.next()
  let promise2 = posts.next()
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
  deepStrictEqual(await promise1, [POST2])
  deepStrictEqual(await promise2, [POST2])
})

test('works with cached posts with next page loader', async () => {
  let posts = createPostsList([POST1], async () => {
    return [[POST2], undefined]
  })
  deepStrictEqual(posts.get(), {
    hasNext: true,
    isLoading: false,
    list: [POST1]
  })

  posts.next()
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
