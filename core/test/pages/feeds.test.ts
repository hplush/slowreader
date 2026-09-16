import { openDb } from '@nanostores/sql'
import { nodeDriver } from '@nanostores/sql/node'
import { equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import type { Environment } from '../../environment.ts'
import {
  addCategory,
  addFeed,
  addPost,
  busy,
  busyUntilMenuLoader,
  GENERAL_CATEGORY,
  isDemo,
  menuLoading,
  router,
  setLayoutType,
  testFeed,
  testPost,
  userId,
  waitLoading
} from '../../index.ts'
import {
  cleanClient,
  startClient,
  ensureReader,
  openPage,
  persistentDatabase,
  openRoute,
  setTestUser
} from '../utils.ts'

// The browser re-runs reactive queries after the write, in another
// message from the worker, unlike the Node driver, which updates
// the stores inside the write
function delayedDatabase(): Environment['databaseCreator'] {
  return () => {
    let driver = nodeDriver(':memory:')
    return openDb({
      ...driver,
      subscribe(query, params, cb, onError) {
        let timers = new Set<NodeJS.Timeout>()
        let unbind = driver.subscribe(
          query,
          params,
          rows => {
            let timer = globalThis.setTimeout(() => {
              timers.delete(timer)
              cb(rows)
            }, 20)
            timers.add(timer)
          },
          onError
        )
        return () => {
          for (let timer of timers) clearTimeout(timer)
          unbind()
        }
      }
    })
  }
}

describe('feeds page', () => {
  beforeEach(() => {
    startClient({ databaseCreator: persistentDatabase() })
  })

  afterEach(async () => {
    openRoute({ params: {}, route: 'about' })
    await cleanClient()
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
    equal(page.params.category.get(), undefined)
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
    equal(page.params.category.get(), undefined)
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
    equal(page.params.category.get(), undefined)

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

  test('waits for the menu before opening the next feed', async () => {
    await cleanClient()
    startClient({ databaseCreator: delayedDatabase() })
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
    await setTimeout(50)

    let page = openPage({ params: { feed: feed1 }, route: 'slow' })
    await waitLoading(page.loading)
    let reader = ensureReader(page.posts, 'list')
    let reading = reader.readPage()
    await setTimeout(0)
    equal(reader.readingPage.get(), true)
    equal(page.params.feed.get(), feed1)

    await reading
    equal(reader.readingPage.get(), false)
    equal(page.params.feed.get(), feed2)

    // The reactive stores of this database are late, so the page
    // is closed here to finish its cleaning before the client is cleaned
    openRoute({ params: {}, route: 'about' })
    await setTimeout(50)
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
    await ensureReader(page.posts, 'feed').readPage()
    await setTimeout(10)

    let next = openPage({ params: {}, route: 'slow' })
    equal(next.params.feed.get(), slow)
    equal(router.get().route, 'slow')
  })

  test('opens the next fast category after the last post was read', async () => {
    busyUntilMenuLoader()
    await waitLoading(busy)
    let first = await addFeed(
      testFeed({
        categoryId: await addCategory({ fastReader: 'feed', title: 'A1' }),
        fastReader: 'feed',
        reading: 'fast'
      })
    )
    let category = await addCategory({ fastReader: 'feed', title: 'A2' })
    let second = await addFeed(
      testFeed({ categoryId: category, fastReader: 'feed', reading: 'fast' })
    )
    await addPost(testPost({ feedId: first, reading: 'fast' }))
    await addPost(testPost({ feedId: second, reading: 'fast' }))
    await setTimeout(10)

    let page = openPage({ params: {}, route: 'fast' })
    await waitLoading(page.loading)
    await ensureReader(page.posts, 'feed').readPage()
    await setTimeout(10)

    equal(router.get().route, 'fast')
    equal(page.params.category.get(), category)
    equal(ensureReader(page.posts, 'feed').list.get().length, 1)
  })

  test('opens the first fast category with posts', async () => {
    busyUntilMenuLoader()
    await waitLoading(busy)
    await addFeed(
      testFeed({
        categoryId: await addCategory({ fastReader: 'feed', title: 'A1' }),
        fastReader: 'feed',
        reading: 'fast'
      })
    )
    let category = await addCategory({ fastReader: 'feed', title: 'A2' })
    let feed = await addFeed(
      testFeed({ categoryId: category, fastReader: 'feed', reading: 'fast' })
    )
    await addPost(testPost({ feedId: feed, reading: 'fast' }))
    await setTimeout(10)

    let page = openPage({ params: {}, route: 'fast' })
    await waitLoading(page.loading)
    equal(page.params.category.get(), category)
    equal(ensureReader(page.posts, 'feed').list.get().length, 1)
  })

  test('renders empty reader for the fast category without posts', async () => {
    busyUntilMenuLoader()
    await waitLoading(busy)
    let read = await addCategory({ fastReader: 'feed', title: 'A1' })
    await addFeed(
      testFeed({ categoryId: read, fastReader: 'feed', reading: 'fast' })
    )
    let unread = await addCategory({ fastReader: 'feed', title: 'A2' })
    let feed = await addFeed(
      testFeed({ categoryId: unread, fastReader: 'feed', reading: 'fast' })
    )
    await addPost(testPost({ feedId: feed, reading: 'fast' }))
    await setTimeout(10)

    let page = openPage({ params: { category: read }, route: 'fast' })
    await waitLoading(page.loading)
    let reader = page.posts.get()
    equal(reader?.name, 'empty')
    equal(reader?.name === 'empty' && reader.category, true)

    page = openPage({ params: {}, route: 'fast' })
    await setTimeout(10)
    equal(page.params.category.get(), unread)
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

  test('shows the welcome only without the exact target in the demo mode', async () => {
    isDemo.set(true)
    busyUntilMenuLoader()
    await waitLoading(busy)
    let category = await addCategory({ title: 'A' })
    let feed = await addFeed(
      testFeed({ categoryId: category, reading: 'slow', slowReader: 'list' })
    )
    await addFeed(testFeed({ categoryId: category, reading: 'fast' }))
    await addPost(testPost({ feedId: feed, reading: 'slow' }))
    await setTimeout(10)

    let page = openPage({ params: {}, route: 'slow' })
    await waitLoading(page.loading)
    equal(page.params.feed.get(), undefined)
    equal(page.posts.get()!.name, 'welcome')

    page = openPage({ params: {}, route: 'fast' })
    await waitLoading(page.loading)
    equal(page.params.category.get(), undefined)
    equal(page.posts.get()!.name, 'welcome')

    page = openPage({ params: { feed }, route: 'slow' })
    await setTimeout(10)
    equal(page.posts.get()!.name, 'list')
    equal(ensureReader(page.posts, 'list').list.get().length, 1)
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
    equal(page.posts.get()!.name, 'empty')

    page = openPage({
      params: { category: category2 },
      route: 'fast'
    })
    equal(page.posts.get(), undefined)
    await setTimeout(1)
    equal(page.posts.get()!.name, 'feed')

    page.changeReader('list')
    await setTimeout(10)
    equal(page.posts.get()!.name, 'list')

    page = openPage({
      params: { category: category1 },
      route: 'fast'
    })
    await setTimeout(10)
    equal(page.posts.get()!.name, 'empty')

    page = openPage({
      params: { category: category2 },
      route: 'fast'
    })
    await setTimeout(10)
    equal(page.posts.get()!.name, 'list')
  })
})
