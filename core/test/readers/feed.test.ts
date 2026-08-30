import { deepEqual, equal, notEqual } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addCategory,
  addFeed,
  addPost,
  changePost,
  deletePost,
  type FeedReader,
  type Page,
  testFeed,
  testPost,
  waitLoading
} from '../../index.ts'
import { stringifyCursor, topCursor } from '../../readers/common.ts'
import {
  cleanClientTest,
  enableClientTest,
  ensureReader,
  openPage,
  setBaseTestRoute
} from '../utils.ts'

async function moveTo(
  page: Page<'fast'>,
  from: string | undefined
): Promise<void> {
  page.params.from.set(from)
  await waitLoading(page.postsLoading)
}

function titles(reader: FeedReader): string[] {
  return reader.list.get().map(post => post.title!)
}

describe('feed reader', () => {
  beforeEach(() => {
    enableClientTest()
  })

  afterEach(async () => {
    // Without it the page of the test will be mounted during the next test
    setBaseTestRoute({ params: {}, route: 'about' })
    await cleanClientTest()
  })

  test('reads posts', async () => {
    let categoryId = await addCategory({ fastReader: 'feed', title: 'A' })
    let feed1 = await addFeed(testFeed({ categoryId, fastReader: 'feed' }))
    let feed2 = await addFeed(testFeed({ categoryId, fastReader: 'feed' }))
    for (let i = 1; i <= 60; i++) {
      await addPost(
        testPost({
          feedId: i % 2 === 0 ? feed1 : feed2,
          publishedAt: i,
          reading: 'fast',
          title: `${i}`
        })
      )
    }

    let page = openPage({
      params: { feed: feed1 },
      route: 'fast'
    })
    equal(page.loading.get(), true)
    equal(page.postsLoading.get(), true)
    await waitLoading(page.loading)
    equal(page.postsLoading.get(), false)
    let reader = ensureReader(page.posts, 'feed')
    equal(reader.hasNext.get(), false)
    equal(reader.authors.get().size, 0)
    equal(reader.list.get().length, 30)
    equal(reader.list.get()[0]!.title, '60')

    page = openPage({
      params: { category: categoryId },
      route: 'fast'
    })
    equal(page.loading.get(), false)
    equal(page.postsLoading.get(), true)
    await waitLoading(page.postsLoading)
    reader = ensureReader(page.posts, 'feed')
    equal(reader.hasNext.get(), true)
    equal(reader.authors.get().size, 2)
    equal(reader.authors.get().get(feed1)!.title, 'Test 1')
    equal(reader.authors.get().get(feed2)!.url, 'http://example.com/2')
    equal(reader.list.get().length, 40)
    equal(reader.list.get()[0]!.title, '60')
    equal(reader.list.get()[39]!.title, '21')

    await moveTo(page, stringifyCursor(topCursor(10)))
    equal(page.loading.get(), false)
    equal(reader.list.get().length, 9)
    equal(reader.list.get()[0]!.title, '9')
    equal(reader.hasNext.get(), false)

    await moveTo(page, undefined)
    equal(reader.list.get()[0]!.title, '60')
    equal(reader.list.get().length, 40)

    await reader.readAndNext()
    await waitLoading(page.postsLoading)
    equal(reader.list.get()[0]!.title, '20')
    equal(reader.list.get().length, 20)
    equal(reader.hasNext.get(), false)

    await reader.readAndNext()
    equal(page.posts.get()?.name, 'empty')
    await setTimeout(10)

    openPage({
      params: {},
      route: 'interface'
    })
    await setTimeout(10)
    page = openPage({
      params: { feed: feed1 },
      route: 'fast'
    })
    await setTimeout(10)
    equal(page.posts.get()?.name, 'empty')

    page = openPage({
      params: { category: categoryId },
      route: 'fast'
    })
    equal(page.posts.get()?.name, 'empty')
  })

  test('moves between pages', async () => {
    let categoryId = await addCategory({ fastReader: 'feed', title: 'A' })
    let feed1 = await addFeed(testFeed({ categoryId, fastReader: 'feed' }))
    let feed2 = await addFeed(testFeed({ categoryId, fastReader: 'feed' }))
    for (let i = 1; i <= 110; i++) {
      await addPost(
        testPost({
          feedId: i % 2 === 0 ? feed1 : feed2,
          publishedAt: i,
          reading: 'fast',
          title: `${i}`
        })
      )
    }

    let page = openPage({
      params: { category: categoryId },
      route: 'fast'
    })
    await waitLoading(page.loading)
    let reader = ensureReader(page.posts, 'feed')
    equal(reader.hasNext.get(), true)
    equal(reader.prevFrom.get(), undefined)
    equal(reader.list.get().length, 40)
    equal(reader.list.get()[0]!.title, '110')
    equal(reader.list.get()[0]!.read, 0)

    await moveTo(page, reader.nextFrom.get())
    equal(reader.hasNext.get(), true)
    equal(reader.list.get().length, 40)
    equal(reader.list.get()[0]!.title, '70')

    // Nothing was read, so the previous page has the same posts as before
    await moveTo(page, reader.prevFrom.get())
    equal(reader.list.get().length, 40)
    equal(reader.list.get()[0]!.title, '110')

    // Read posts are not shown again, so there is no page above anymore
    await reader.readAndNext()
    await waitLoading(page.postsLoading)
    equal(reader.list.get()[0]!.title, '70')
    equal(reader.prevFrom.get(), undefined)

    await moveTo(page, reader.nextFrom.get())
    equal(reader.hasNext.get(), false)
    equal(reader.list.get().length, 30)
    equal(reader.list.get()[0]!.title, '30')

    // The previous page is still full of unread posts
    notEqual(reader.prevFrom.get(), undefined)
    await moveTo(page, reader.prevFrom.get())
    equal(reader.list.get().length, 40)
    equal(reader.list.get()[0]!.title, '70')
  })

  test('loads intro without the whole article', async () => {
    let feedId = await addFeed(testFeed({ fastReader: 'feed' }))
    for (let post of [
      { full: 'Full article', intro: 'Intro', publishedAt: 4 },
      { full: 'Same', intro: 'Same', publishedAt: 3 },
      { full: 'Short article', intro: null, publishedAt: 2 },
      { full: 'a'.repeat(6000), intro: '', publishedAt: 1 }
    ]) {
      await addPost(testPost({ feedId, reading: 'fast', ...post }))
    }

    let page = openPage({
      params: { feed: feedId },
      route: 'fast'
    })
    await waitLoading(page.loading)
    let reader = ensureReader(page.posts, 'feed')
    let [cut, same, short, long] = reader.list.get()

    // The article is not loaded when the feed has its own intro
    equal(cut!.full, null)
    equal(cut!.more, 1)
    equal(same!.full, null)
    equal(same!.more, 0)

    // Without the feed’s intro the card cuts the article itself.
    // An empty intro is the same as no intro, so it comes as `null`
    equal(short!.full, 'Short article')
    equal(short!.more, 0)
    equal(long!.intro, null)
    equal(long!.full!.length, 6000)
    equal(long!.more, 0)
  })

  test('does not skip posts changed by another client', async () => {
    let feedId = await addFeed(testFeed({ fastReader: 'feed' }))
    for (let i = 1; i <= 100; i++) {
      await addPost(
        testPost({ feedId, publishedAt: i, reading: 'fast', title: `${i}` })
      )
    }

    let page = openPage({
      params: { feed: feedId },
      route: 'fast'
    })
    await waitLoading(page.loading)
    let reader = ensureReader(page.posts, 'feed')
    let shown = new Set(titles(reader))
    equal(shown.size, 40)

    await moveTo(page, reader.nextFrom.get())
    let second = reader.list.get()

    // Another tab or device reads and deletes posts of the current page
    await changePost(
      second.slice(0, 5).map(post => post.id),
      { read: 1 }
    )
    await deletePost(second.slice(5, 10).map(post => post.id))
    let removed = new Set(second.slice(0, 10).map(post => post.title!))

    // Walk the rest of the feed from the same cursor
    await moveTo(page, reader.prevFrom.get())
    while (true) {
      for (let title of titles(reader)) shown.add(title)
      if (!reader.hasNext.get()) break
      await moveTo(page, reader.nextFrom.get())
    }

    for (let i = 1; i <= 100; i++) {
      let title = `${i}`
      if (removed.has(title)) continue
      equal(shown.has(title), true, `Post ${title} was skipped`)
    }
  })

  test('moves between pages of posts of the same time', async () => {
    let feedId = await addFeed(testFeed({ fastReader: 'feed' }))
    for (let i = 1; i <= 100; i++) {
      await addPost(
        testPost({ feedId, publishedAt: 1, reading: 'fast', title: `${i}` })
      )
    }

    let page = openPage({ params: { feed: feedId }, route: 'fast' })
    await waitLoading(page.loading)
    let reader = ensureReader(page.posts, 'feed')
    let shown = new Set(titles(reader))
    equal(shown.size, 40)

    await moveTo(page, reader.nextFrom.get())
    let second = titles(reader)
    for (let title of second) shown.add(title)
    equal(shown.size, 80)

    // The previous page shows the same posts as before
    await moveTo(page, reader.prevFrom.get())
    deepEqual(titles(reader), [...shown].slice(0, 40))

    await moveTo(page, reader.nextFrom.get())
    await moveTo(page, reader.nextFrom.get())
    equal(reader.hasNext.get(), false)
    for (let title of titles(reader)) shown.add(title)
    equal(shown.size, 100)
  })
})
