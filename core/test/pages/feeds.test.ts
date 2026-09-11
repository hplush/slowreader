import { equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addCategory,
  addFeed,
  addPost,
  busy,
  busyUntilMenuLoader,
  GENERAL_CATEGORY,
  menuLoading,
  router,
  setLayoutType,
  testFeed,
  testPost,
  userId,
  waitLoading
} from '../../index.ts'
import {
  cleanClientTest,
  enableClientTest,
  ensureReader,
  openPage,
  persistentDatabase,
  setBaseTestRoute,
  setTestUser
} from '../utils.ts'

describe('feeds page', () => {
  beforeEach(() => {
    enableClientTest({ databaseCreator: persistentDatabase() })
  })

  afterEach(async () => {
    setBaseTestRoute({ params: {}, route: 'about' })
    await cleanClientTest()
  })

  test('redirects', async () => {
    busyUntilMenuLoader()
    await waitLoading(busy)

    let page = openPage({
      params: {},
      route: 'slow'
    })
    equal(page.params.category.get(), undefined)
    equal(page.params.feed.get(), undefined)
    await waitLoading(page.loading)
    equal(page.posts.get()!.name, 'welcome')

    page = openPage({
      params: {},
      route: 'fast'
    })
    equal(page.params.category.get(), GENERAL_CATEGORY)
    await waitLoading(page.loading)
    equal(page.posts.get()!.name, 'welcome')

    let category1 = await addCategory({ title: 'A1' })
    let category2 = await addCategory({ title: 'A2' })
    let feed1 = await addFeed(
      testFeed({ categoryId: category1, reading: 'fast' })
    )
    let feed2 = await addFeed(
      testFeed({ categoryId: category2, reading: 'slow' })
    )

    page = openPage({
      params: {},
      route: 'slow'
    })
    equal(page.params.category.get(), undefined)
    equal(page.params.feed.get(), undefined)
    await waitLoading(page.loading)
    equal(page.posts.get()!.name, 'empty')

    page = openPage({
      params: {},
      route: 'fast'
    })
    equal(page.params.category.get(), category1)
    equal(page.params.feed.get(), undefined)
    await waitLoading(page.loading)
    equal(page.posts.get()!.name, 'empty')

    await addPost(testPost({ feedId: feed2, reading: 'slow' }))
    await addPost(testPost({ feedId: feed1, reading: 'fast' }))

    page = openPage({
      params: {},
      route: 'slow'
    })
    equal(page.params.category.get(), undefined)
    equal(page.params.feed.get(), feed2)
    equal(page.loading.get(), true)
    await waitLoading(page.loading)
    equal(page.posts.get()!.name, 'list')

    page = openPage({
      params: {},
      route: 'fast'
    })
    equal(page.params.category.get(), category1)
    equal(page.params.feed.get(), undefined)
    equal(page.loading.get(), true)
    await waitLoading(page.loading)
    equal(page.posts.get()!.name, 'feed')
  })

  test('redirects when the menu was loaded after the page', async () => {
    busyUntilMenuLoader()
    await waitLoading(busy)
    let category = await addCategory({ title: 'A' })
    let feed = await addFeed(
      testFeed({ categoryId: category, reading: 'slow' })
    )
    await addPost(testPost({ feedId: feed, reading: 'slow' }))
    await setTimeout(10)

    // On the app start the page is created before the menu was counted
    userId.set(undefined)
    await setTimeout(10)
    setTestUser()
    equal(menuLoading.get(), true)

    let page = openPage({
      params: {},
      route: 'slow'
    })
    equal(page.params.feed.get(), undefined)

    await waitLoading(page.loading)
    equal(page.params.feed.get(), feed)
    equal(page.posts.get()!.name, 'list')
  })

  test('shows the menu instead of the redirect outside of the desktop', async () => {
    setLayoutType('mobile')
    busyUntilMenuLoader()
    await waitLoading(busy)
    let category1 = await addCategory({ title: 'A1' })
    let feed = await addFeed(
      testFeed({ categoryId: category1, reading: 'slow' })
    )
    await addFeed(testFeed({ categoryId: category1, reading: 'fast' }))
    await addPost(testPost({ feedId: feed, reading: 'slow' }))
    await setTimeout(10)

    let page = openPage({
      params: {},
      route: 'slow'
    })
    equal(page.menu.get(), true)
    equal(page.params.feed.get(), undefined)
    equal(page.loading.get(), false)
    equal(page.posts.get(), undefined)

    // The only category has nothing to choose from
    page = openPage({
      params: {},
      route: 'fast'
    })
    equal(page.menu.get(), false)
    equal(page.params.category.get(), category1)

    await addFeed(testFeed({ categoryId: await addCategory({ title: 'A2' }) }))
    await setTimeout(10)
    page = openPage({
      params: {},
      route: 'fast'
    })
    equal(page.menu.get(), true)
    equal(page.params.category.get(), undefined)

    // The feed from the menu hides it
    page = openPage({
      params: { feed },
      route: 'slow'
    })
    equal(page.menu.get(), false)
    await waitLoading(page.loading)
    equal(page.posts.get()!.name, 'list')
  })

  test('opens the next feed after the last page was read', async () => {
    busyUntilMenuLoader()
    await waitLoading(busy)
    let category = await addCategory({ title: 'A' })
    let feed1 = await addFeed(
      testFeed({ categoryId: category, slowReader: 'list', title: 'F1' })
    )
    let feed2 = await addFeed(
      testFeed({ categoryId: category, slowReader: 'list', title: 'F2' })
    )
    await addPost(testPost({ feedId: feed1, reading: 'slow' }))
    await addPost(testPost({ feedId: feed2, reading: 'slow' }))
    await setTimeout(10)

    let page = openPage({ params: { feed: feed1 }, route: 'slow' })
    await waitLoading(page.loading)
    await ensureReader(page.posts, 'list').readPage()
    await setTimeout(10)

    equal(page.params.feed.get(), feed2)
    equal(page.posts.get()!.name, 'list')
  })

  test('opens the next feed before the posts were marked as read', async () => {
    busyUntilMenuLoader()
    await waitLoading(busy)
    let category = await addCategory({ title: 'A' })
    let feed1 = await addFeed(
      testFeed({ categoryId: category, slowReader: 'list', title: 'F1' })
    )
    let feed2 = await addFeed(
      testFeed({ categoryId: category, slowReader: 'list', title: 'F2' })
    )
    await addPost(testPost({ feedId: feed1, reading: 'slow' }))
    await addPost(testPost({ feedId: feed2, reading: 'slow' }))
    await setTimeout(10)

    let page = openPage({ params: { feed: feed1 }, route: 'slow' })
    await waitLoading(page.loading)
    let reading = ensureReader(page.posts, 'list').readPage()
    await setTimeout(0)
    equal(page.params.feed.get(), feed2)

    await reading
  })

  test('gives the reading back when no other feed has posts', async () => {
    busyUntilMenuLoader()
    await waitLoading(busy)
    let feed = await addFeed(
      testFeed({
        categoryId: await addCategory({ title: 'A' }),
        slowReader: 'list'
      })
    )
    await addPost(testPost({ feedId: feed, reading: 'slow' }))
    await setTimeout(10)

    let page = openPage({ params: { feed }, route: 'slow' })
    await waitLoading(page.loading)
    await ensureReader(page.posts, 'list').readPage()
    await setTimeout(10)

    equal(page.params.feed.get(), undefined)
    equal(page.posts.get()!.name, 'empty')
  })

  test('opens the next feed even when pages above are unread', async () => {
    busyUntilMenuLoader()
    await waitLoading(busy)
    let category = await addCategory({ title: 'A' })
    let feed1 = await addFeed(
      testFeed({ categoryId: category, slowReader: 'list', title: 'F1' })
    )
    let feed2 = await addFeed(
      testFeed({ categoryId: category, slowReader: 'list', title: 'F2' })
    )
    for (let i = 1; i <= 150; i++) {
      await addPost(
        testPost({ feedId: feed1, publishedAt: i, reading: 'slow' })
      )
    }
    await addPost(testPost({ feedId: feed2, reading: 'slow' }))
    await setTimeout(10)

    let page = openPage({ params: { feed: feed1, from: '1' }, route: 'slow' })
    await waitLoading(page.loading)
    let reader = ensureReader(page.posts, 'list')
    equal(reader.pages.get().hasNext, false)

    await reader.readPage()
    await setTimeout(10)
    equal(page.params.feed.get(), feed2)
  })

  test('opens the menu after the last page was read outside of the desktop', async () => {
    setLayoutType('mobile')
    busyUntilMenuLoader()
    await waitLoading(busy)
    let feed1 = await addFeed(
      testFeed({
        categoryId: await addCategory({ title: 'A1' }),
        slowReader: 'list'
      })
    )
    let feed2 = await addFeed(
      testFeed({
        categoryId: await addCategory({ title: 'A2' }),
        slowReader: 'list'
      })
    )
    await addPost(testPost({ feedId: feed1, reading: 'slow' }))
    await addPost(testPost({ feedId: feed2, reading: 'slow' }))
    await setTimeout(10)

    let page = openPage({ params: { feed: feed1 }, route: 'slow' })
    await waitLoading(page.loading)
    await ensureReader(page.posts, 'list').readPage()
    await setTimeout(10)

    equal(page.params.feed.get(), undefined)
    equal(page.menu.get(), true)
  })

  test('opens the menu before the posts were marked as read', async () => {
    setLayoutType('mobile')
    busyUntilMenuLoader()
    await waitLoading(busy)
    let feed1 = await addFeed(
      testFeed({
        categoryId: await addCategory({ title: 'A1' }),
        slowReader: 'list'
      })
    )
    await addFeed(
      testFeed({
        categoryId: await addCategory({ title: 'A2' }),
        slowReader: 'list'
      })
    )
    await addPost(testPost({ feedId: feed1, reading: 'slow' }))
    await setTimeout(10)

    let page = openPage({ params: { feed: feed1 }, route: 'slow' })
    await waitLoading(page.loading)
    let reading = ensureReader(page.posts, 'list').readPage()
    await setTimeout(0)
    equal(page.params.feed.get(), undefined)

    await reading
  })

  test('opens other fast posts after the last post of the category', async () => {
    busyUntilMenuLoader()
    await waitLoading(busy)
    let first = await addFeed(
      testFeed({
        categoryId: await addCategory({ fastReader: 'feed', title: 'A1' }),
        fastReader: 'feed',
        reading: 'fast'
      })
    )
    let second = await addFeed(
      testFeed({
        categoryId: await addCategory({ fastReader: 'feed', title: 'A2' }),
        fastReader: 'feed',
        reading: 'fast'
      })
    )
    await addPost(testPost({ feedId: first, reading: 'fast' }))
    await addPost(testPost({ feedId: second, reading: 'fast' }))
    await setTimeout(10)

    let page = openPage({ params: { feed: second }, route: 'fast' })
    await waitLoading(page.loading)
    await ensureReader(page.posts, 'feed').readAndNext()
    await setTimeout(10)

    equal(router.get().route, 'fast')
    equal(page.params.feed.get(), undefined)
  })

  test('opens slow feeds after the last fast post was read', async () => {
    busyUntilMenuLoader()
    await waitLoading(busy)
    let fast = await addFeed(
      testFeed({
        categoryId: await addCategory({ fastReader: 'feed', title: 'A1' }),
        fastReader: 'feed',
        reading: 'fast'
      })
    )
    let slow = await addFeed(
      testFeed({
        categoryId: await addCategory({ title: 'A2' }),
        slowReader: 'list'
      })
    )
    await addPost(testPost({ feedId: fast, reading: 'fast' }))
    await addPost(testPost({ feedId: slow, reading: 'slow' }))
    await setTimeout(10)

    let page = openPage({ params: {}, route: 'fast' })
    await waitLoading(page.loading)
    await ensureReader(page.posts, 'feed').readAndNext()
    await setTimeout(10)

    let next = openPage({ params: {}, route: 'slow' })
    equal(next.params.feed.get(), slow)
    equal(router.get().route, 'slow')
  })

  test('renders empty reader when the menu has no feed to open', async () => {
    busyUntilMenuLoader()
    await waitLoading(busy)
    await addFeed(testFeed({ reading: 'fast' }))
    await addPost(testPost({ feedId: 'unknown', reading: 'slow' }))
    await setTimeout(10)

    let page = openPage({
      params: {},
      route: 'slow'
    })
    await waitLoading(page.loading)
    equal(page.params.feed.get(), undefined)
    equal(page.posts.get()!.name, 'empty')
  })

  test('loads readers', async () => {
    let empty = openPage({
      params: {},
      route: 'slow'
    })
    await waitLoading(empty.loading)
    await setTimeout(10)
    equal(empty.posts.get()?.name, 'welcome')

    let category1 = await addCategory({ title: '1' })
    let category2 = await addCategory({ title: '1' })
    let feed1 = await addFeed(
      testFeed({ categoryId: category1, reading: 'slow' })
    )
    let feed2 = await addFeed(
      testFeed({ categoryId: category2, reading: 'fast' })
    )
    let feed3 = await addFeed(
      testFeed({ categoryId: GENERAL_CATEGORY, reading: 'slow' })
    )
    let page = openPage({
      params: { feed: feed3 },
      route: 'slow'
    })
    await setTimeout(10)
    equal(page.posts.get()!.name, 'empty')

    await addPost(testPost({ feedId: feed1, reading: 'slow' }))
    await addPost(testPost({ feedId: feed3, reading: 'slow' }))
    page = openPage({
      params: { feed: feed3 },
      route: 'slow'
    })
    await setTimeout(10)
    equal(page.posts.get()!.name, 'list')

    page = openPage({
      params: { feed: feed1 },
      route: 'slow'
    })
    await setTimeout(10)
    equal(page.posts.get()!.name, 'list')

    page.changeReader('feed')
    await setTimeout(1)
    equal(page.posts.get()!.name, 'feed')

    page = openPage({
      params: { feed: feed2 },
      route: 'slow'
    })
    await setTimeout(10)
    equal(page.posts.get()!.name, 'list')

    page = openPage({
      params: { feed: feed1 },
      route: 'slow'
    })
    await setTimeout(10)
    equal(page.posts.get()!.name, 'feed')

    page = openPage({
      params: { category: category1 },
      route: 'fast'
    })
    await setTimeout(1)
    equal(page.posts.get()!.name, 'empty')

    await addPost(testPost({ feedId: feed2, reading: 'fast' }))
    await setTimeout(10)
    equal(page.posts.get()!.name, 'feed')

    page.changeReader('list')
    await setTimeout(10)
    equal(page.posts.get()!.name, 'list')

    page = openPage({
      params: { category: category2 },
      route: 'fast'
    })
    equal(page.posts.get(), undefined)
    await setTimeout(1)
    equal(page.posts.get()!.name, 'feed')

    page = openPage({
      params: { category: category1 },
      route: 'fast'
    })
    await setTimeout(10)
    equal(page.posts.get()!.name, 'list')
  })
})
