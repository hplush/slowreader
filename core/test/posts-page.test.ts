import { setTimeout } from 'node:timers/promises'
import { test } from 'uvu'
import { equal } from 'uvu/assert'

import { type OriginPost, postsPage } from '../index.js'

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
  let posts = postsPage([POST1], undefined)
  equal(posts.get(), {
    hasNext: false,
    isLoading: false,
    list: [POST1]
  })

  posts.nextPage()
  equal(posts.get(), {
    hasNext: false,
    isLoading: false,
    list: [POST1]
  })
})

test('works without posts', async () => {
  let posts = postsPage(undefined, async () => {
    return [[POST1], async () => [[POST2], undefined]]
  })
  equal(posts.get(), {
    hasNext: true,
    isLoading: true,
    list: []
  })

  await setTimeout(1)
  equal(posts.get(), {
    hasNext: true,
    isLoading: false,
    list: [POST1]
  })

  posts.nextPage()
  equal(posts.get(), {
    hasNext: true,
    isLoading: true,
    list: [POST1]
  })

  await setTimeout(1)
  equal(posts.get(), {
    hasNext: false,
    isLoading: false,
    list: [POST1, POST2]
  })

  posts.nextPage()
  equal(posts.get(), {
    hasNext: false,
    isLoading: false,
    list: [POST1, POST2]
  })
})

test('is ready for double calls', async () => {
  let posts = postsPage(undefined, async () => {
    return [[POST1], async () => [[POST2], undefined]]
  })
  posts.nextPage()
  await setTimeout(1)
  equal(posts.get(), {
    hasNext: true,
    isLoading: false,
    list: [POST1]
  })

  posts.nextPage()
  posts.nextPage()
  equal(posts.get(), {
    hasNext: true,
    isLoading: true,
    list: [POST1]
  })

  await setTimeout(1)
  equal(posts.get(), {
    hasNext: false,
    isLoading: false,
    list: [POST1, POST2]
  })
})

test('works with cached posts with next page loader', async () => {
  let posts = postsPage([POST1], async () => {
    return [[POST2], undefined]
  })
  equal(posts.get(), {
    hasNext: true,
    isLoading: false,
    list: [POST1]
  })

  posts.nextPage()
  equal(posts.get(), {
    hasNext: true,
    isLoading: true,
    list: [POST1]
  })

  await setTimeout(1)
  equal(posts.get(), {
    hasNext: false,
    isLoading: false,
    list: [POST1, POST2]
  })
})

test.run()
