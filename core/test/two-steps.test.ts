import './dom-parser.ts'

import { deepStrictEqual, strictEqual } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addCategory,
  addFeed,
  addPost,
  backRoute,
  backToFirstStep,
  checkAndRemoveRequestMock,
  expectRequest,
  mockRequest,
  router,
  secondStep,
  setBaseTestRoute,
  setIsMobile,
  setPreviewUrl,
  testFeed,
  testPost
} from '../index.ts'
import { cleanClientTest, enableClientTest } from './utils.ts'

beforeEach(() => {
  enableClientTest()
  secondStep.set(false)
  mockRequest()
})

afterEach(async () => {
  await cleanClientTest()
  checkAndRemoveRequestMock()
})

test('works with adds route on wide screen', async () => {
  setIsMobile(false)
  setBaseTestRoute({
    params: { candidate: undefined, url: undefined },
    route: 'add'
  })
  expectRequest('https://a.com/atom').andRespond(
    200,
    '<feed><title>Atom</title>' +
      '<entry><id>2</id><updated>2023-07-01T00:00:00Z</updated></entry>' +
      '<entry><id>1</id><updated>2023-06-01T00:00:00Z</updated></entry>' +
      '</feed>',
    'text/xml'
  )
  setPreviewUrl('https://a.com/atom')
  await setTimeout(10)

  strictEqual(secondStep.get(), true)
  deepStrictEqual(backRoute.get(), {
    params: { candidate: undefined, url: 'https://a.com/atom' },
    popups: [],
    route: 'add'
  })
})

test('works with adds route on mobile screen', async () => {
  setIsMobile(true)
  setBaseTestRoute({
    params: { candidate: undefined, url: undefined },
    route: 'add'
  })
  expectRequest('https://a.com/atom').andRespond(
    200,
    '<feed><title>Atom</title>' +
      '<entry><id>2</id><updated>2023-07-01T00:00:00Z</updated></entry>' +
      '<entry><id>1</id><updated>2023-06-01T00:00:00Z</updated></entry>' +
      '</feed>',
    'text/xml'
  )
  setPreviewUrl('https://a.com/atom')
  await setTimeout(10)

  strictEqual(secondStep.get(), false)
  strictEqual(backRoute.get(), undefined)
})

test('works with categories route', async () => {
  setBaseTestRoute({ params: {}, route: 'categories' })
  strictEqual(secondStep.get(), false)

  let idA = await addCategory({ title: 'A' })
  let feed = await addFeed(testFeed({ categoryId: idA, reading: 'fast' }))
  setBaseTestRoute({ params: { feed }, route: 'categories' })
  await setTimeout(100)

  strictEqual(secondStep.get(), true)
  deepStrictEqual(backRoute.get(), {
    params: {},
    popups: [],
    route: 'categories'
  })
})

test('works with fast route', async () => {
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
    popups: [],
    route: 'fast'
  })
})

test('works with slow route', async () => {
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
    popups: [],
    route: 'slow'
  })
})

test('goes back to first step', async () => {
  let idA = await addCategory({ title: 'A' })
  let feed = await addFeed(testFeed({ categoryId: idA, reading: 'fast' }))
  setBaseTestRoute({ params: { feed }, route: 'categories' })
  await setTimeout(100)

  deepStrictEqual(router.get(), {
    params: { feed },
    popups: [],
    route: 'categories'
  })

  backToFirstStep()

  deepStrictEqual(router.get(), {
    params: {},
    popups: [],
    route: 'categories'
  })

  backToFirstStep()

  deepStrictEqual(router.get(), {
    params: {},
    popups: [],
    route: 'categories'
  })
})
