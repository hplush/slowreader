import { deepStrictEqual, strictEqual } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addCategory,
  addFeed,
  addPost,
  backRoute,
  secondStep,
  setBaseTestRoute,
  showFirstStep,
  showSecondStep,
  testFeed,
  testPost
} from '../index.js'
import { cleanClientTest, enableClientTest } from './utils.js'

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  await cleanClientTest()
})

test('adds route', () => {
  setBaseTestRoute({ params: {}, route: 'add' })
  strictEqual(secondStep.get(), false)

  showSecondStep()
  strictEqual(secondStep.get(), true)
  strictEqual(backRoute.get(), undefined)

  showFirstStep()
  strictEqual(secondStep.get(), false)
})

test('works with categories route', async () => {
  secondStep.set(false)
  setBaseTestRoute({ params: {}, route: 'categories' })
  strictEqual(secondStep.get(), false)

  let idA = await addCategory({ title: 'A' })
  let feed = await addFeed(testFeed({ categoryId: idA, reading: 'fast' }))
  setBaseTestRoute({ params: { feed }, route: 'categories' })
  await setTimeout(100)

  strictEqual(secondStep.get(), true)
  deepStrictEqual(backRoute.get(), {
    params: {},
    route: 'categories'
  })
})

test('works withfast route', async () => {
  secondStep.set(false)
  let idA = await addCategory({ title: 'A' })
  let feed = await addFeed(testFeed({ categoryId: idA, reading: 'fast' }))
  let post = await addPost(testPost({ feedId: feed }))

  setBaseTestRoute({ params: { category: idA }, route: 'fast' })
  await setTimeout(100)

  strictEqual(secondStep.get(), false)

  setBaseTestRoute({ params: { category: idA, post }, route: 'fast' })
  await setTimeout(100)

  strictEqual(secondStep.get(), true)
  deepStrictEqual(backRoute.get(), {
    params: { category: idA },
    route: 'fast'
  })
})

test('works with slow route', async () => {
  secondStep.set(false)
  let idA = await addCategory({ title: 'A' })
  let feed = await addFeed(testFeed({ categoryId: idA, reading: 'slow' }))
  let post = await addPost(testPost({ feedId: feed, reading: 'slow' }))

  setBaseTestRoute({ params: { feed }, route: 'slow' })
  await setTimeout(100)

  strictEqual(secondStep.get(), false)

  setBaseTestRoute({ params: { feed, post }, route: 'slow' })
  await setTimeout(100)

  strictEqual(secondStep.get(), true)
  deepStrictEqual(backRoute.get(), {
    params: { feed },
    route: 'slow'
  })
})
