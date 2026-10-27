import { equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  addCategory,
  addFeed,
  addPost,
  testFeed,
  testPost,
  waitLoading
} from '../../index.ts'
import {
  cleanClient,
  numberPagination,
  ensureReader,
  openPage,
  openRoute,
  nextPagination,
  startClient
} from '../utils.ts'

describe('list reader', () => {
  beforeEach(() => {
    startClient()
  })

  afterEach(async () => {
    // Without it the page of the test will be mounted during the next test
    openRoute({ params: {}, route: 'about' })
    await cleanClient()
  })

  test('picks pager by reading', async () => {
    let categoryId = await addCategory({ fastReader: 'list', title: 'A' })
    let fast = await addFeed(testFeed({ categoryId }))
    let slow = await addFeed(testFeed({ slowReader: 'list' }))
    for (let i = 1; i <= 75; i++) {
      await addPost(
        testPost({
          feedId: fast,
          publishedAt: i,
          reading: 'fast',
          title: `${i}`
        })
      )
      await addPost(
        testPost({
          feedId: slow,
          publishedAt: i,
          reading: 'slow',
          title: `${i}`
        })
      )
    }

    let page = openPage({ params: { category: categoryId }, route: 'fast' })
    await waitLoading(page.postsLoading)
    let reader = ensureReader(page.posts, 'list')
    equal(reader.list.get().length, 50)
    equal(reader.list.get()[0]!.title, '75')
    equal(nextPagination(reader).hasNext.get(), true)

    page = openPage({ params: { feed: slow }, route: 'slow' })
    await waitLoading(page.postsLoading)
    reader = ensureReader(page.posts, 'list')
    equal(reader.list.get().length, 50)
    equal(numberPagination(reader).pages.get().count, 2)
  })
})
