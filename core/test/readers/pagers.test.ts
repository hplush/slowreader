import { atom, keepMount, type WritableAtom } from 'nanostores'
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
  type FeedsPage,
  type ListReader,
  loadPostsByFeed,
  router,
  slowMenu,
  testFeed,
  testPost,
  waitLoading
} from '../../index.ts'
import { stringifyCursor, topCursor } from '../../readers/common.ts'
import { numberPager, nextPager } from '../../readers/pagers.ts'
import {
  cleanClient,
  numberPagination,
  ensureReader,
  openPage,
  openRoute,
  nextPagination,
  startClient
} from '../utils.ts'

async function moveTo(
  page: FeedsPage,
  from: string | undefined
): Promise<void> {
  openRoute({ params: { ...router.get().params, from }, route: page.reading })
  await waitLoading(page.postsLoading)
}

function createParams(): Record<
  'category' | 'feed' | 'from',
  WritableAtom<string | undefined>
> {
  return {
    category: atom<string | undefined>(),
    feed: atom<string | undefined>(),
    from: atom<string | undefined>()
  }
}

function titles(reader: Pick<FeedReader | ListReader, 'list'>): string[] {
  return reader.list.get().map(post => post.title!)
}

beforeEach(() => {
  startClient()
})

afterEach(async () => {
  // Without it the page of the test will be mounted during the next test
  openRoute({ params: {}, route: 'about' })
  await cleanClient()
})

describe('next pager', () => {
  async function addFastPosts(
    count: number,
    publishedAt: (i: number) => number = i => i
  ): Promise<{ categoryId: string; last: string }> {
    let categoryId = await addCategory({ fastReader: 'feed', title: 'A' })
    let feed1 = await addFeed(testFeed({ categoryId, fastReader: 'feed' }))
    let feed2 = await addFeed(testFeed({ categoryId, fastReader: 'feed' }))
    let last = ''
    for (let i = 1; i <= count; i++) {
      last = await addPost(
        testPost({
          feedId: i % 2 === 0 ? feed1 : feed2,
          publishedAt: publishedAt(i),
          reading: 'fast',
          title: `${i}`
        })
      )
    }
    return { categoryId, last }
  }

  test('reads pages', async () => {
    let { categoryId } = await addFastPosts(30)

    let page = openPage({ params: { category: categoryId }, route: 'fast' })
    equal(page.postsLoading.get(), true)
    await waitLoading(page.loading)
    let reader = ensureReader(page.posts, 'feed')
    let pagination = nextPagination(reader)
    equal(pagination.hasNext.get(), true)
    equal(reader.list.get().length, 20)
    equal(reader.list.get()[0]!.title, '30')
    equal(reader.list.get()[19]!.title, '11')

    await moveTo(page, stringifyCursor(topCursor(10)))
    equal(pagination.page.get(), 2)
    equal(reader.list.get().length, 9)
    equal(reader.list.get()[0]!.title, '9')
    equal(pagination.hasNext.get(), false)

    await moveTo(page, undefined)
    equal(reader.list.get()[0]!.title, '30')
    equal(reader.list.get().length, 20)

    await reader.readPage()
    await waitLoading(page.postsLoading)
    equal(reader.list.get()[0]!.title, '10')
    equal(reader.list.get().length, 10)
    equal(pagination.hasNext.get(), false)

    // The last page moves to the slow reading: no fast post is left
    await reader.readPage()
    await setTimeout(10)
    equal(router.get().route, 'slow')

    openPage({ params: {}, route: 'interface' })
    await setTimeout(10)
    page = openPage({ params: { category: categoryId }, route: 'fast' })
    equal(page.posts.get()?.name, 'empty')
  })

  test('moves between pages', async () => {
    let { categoryId, last } = await addFastPosts(55)

    let page = openPage({
      params: { category: categoryId },
      popups: [{ param: `id:${last}`, popup: 'post' }],
      route: 'fast'
    })
    await waitLoading(page.loading)
    let reader = ensureReader(page.posts, 'feed')
    let pagination = nextPagination(reader)
    equal(pagination.hasNext.get(), true)
    equal(pagination.prevFrom.get(), undefined)
    equal(reader.list.get().length, 20)
    equal(reader.list.get()[0]!.title, '55')
    equal(reader.list.get()[0]!.read, false)
    equal(pagination.page.get(), 0)

    await moveTo(page, pagination.nextFrom.get())
    equal(pagination.page.get(), 1)
    equal(pagination.hasNext.get(), true)
    equal(reader.list.get().length, 20)
    equal(reader.list.get()[0]!.title, '35')

    // Nothing was read, so the previous page has the same posts as before
    await moveTo(page, pagination.prevFrom.get())
    equal(pagination.page.get(), 0)
    equal(reader.list.get().length, 20)
    equal(reader.list.get()[0]!.title, '55')

    // Read posts are not shown again, so there is no page above anymore
    await reader.readPage()
    await waitLoading(page.postsLoading)
    equal(reader.list.get()[0]!.title, '35')
    equal(pagination.page.get(), 1)
    equal(pagination.prevFrom.get(), undefined)
    deepEqual(router.get().popups, [])

    await moveTo(page, pagination.nextFrom.get())
    equal(pagination.hasNext.get(), false)
    equal(reader.list.get().length, 15)
    equal(reader.list.get()[0]!.title, '15')
    equal(pagination.page.get(), 2)

    // The previous page is still full of unread posts
    notEqual(pagination.prevFrom.get(), undefined)
    await moveTo(page, pagination.prevFrom.get())
    equal(reader.list.get().length, 20)
    equal(reader.list.get()[0]!.title, '35')
    equal(pagination.page.get(), 1)
  })

  test('does not skip posts changed by another client', async () => {
    let { categoryId } = await addFastPosts(50)

    let page = openPage({ params: { category: categoryId }, route: 'fast' })
    await waitLoading(page.postsLoading)
    let reader = ensureReader(page.posts, 'feed')
    let pagination = nextPagination(reader)
    let shown = new Set(titles(reader))
    equal(shown.size, 20)

    await moveTo(page, pagination.nextFrom.get())
    let second = reader.list.get()

    // Another tab or device reads and deletes posts of the current page
    await changePost(
      second.slice(0, 5).map(post => post.id),
      { read: true }
    )
    await deletePost(second.slice(5, 10).map(post => post.id))
    let removed = new Set(second.slice(0, 10).map(post => post.title!))

    // Walk the rest of the feed from the same cursor
    await moveTo(page, pagination.prevFrom.get())
    while (true) {
      for (let title of titles(reader)) shown.add(title)
      if (!pagination.hasNext.get()) break
      await moveTo(page, pagination.nextFrom.get())
    }

    for (let i = 1; i <= 50; i++) {
      let title = `${i}`
      if (removed.has(title)) continue
      equal(shown.has(title), true, `Post ${title} was skipped`)
    }
  })

  test('moves between pages of posts of the same time', async () => {
    let { categoryId } = await addFastPosts(50, () => 1)

    let page = openPage({ params: { category: categoryId }, route: 'fast' })
    await waitLoading(page.postsLoading)
    let reader = ensureReader(page.posts, 'feed')
    let pagination = nextPagination(reader)
    let shown = new Set(titles(reader))
    equal(shown.size, 20)

    await moveTo(page, pagination.nextFrom.get())
    for (let title of titles(reader)) shown.add(title)
    equal(shown.size, 40)

    // The previous page shows the same posts as before
    await moveTo(page, pagination.prevFrom.get())
    deepEqual(titles(reader), [...shown].slice(0, 20))

    await moveTo(page, pagination.nextFrom.get())
    await moveTo(page, pagination.nextFrom.get())
    equal(pagination.hasNext.get(), false)
    for (let title of titles(reader)) shown.add(title)
    equal(shown.size, 50)
  })

  test('reads posts of the feed', async () => {
    let feedId = await addFeed(testFeed({ reading: 'fast' }))
    for (let i = 1; i <= 25; i++) {
      await addPost(
        testPost({ feedId, publishedAt: i, reading: 'fast', title: `${i}` })
      )
    }

    let params = createParams()
    let pager = nextPager({ feedId, reading: 'fast' }, params, 20)
    await waitLoading(pager.loading)
    equal(titles(pager)[0], '25')
    let { nextFrom, prevFrom } = pager.pagination
    params.from.set(nextFrom.get())
    await waitLoading(pager.loading)
    deepEqual(titles(pager), ['5', '4', '3', '2', '1'])
    params.from.set(prevFrom.get())
    await waitLoading(pager.loading)
    equal(titles(pager)[0], '25')
    pager.exit()
  })
})

describe('number pager', () => {
  async function addSlowPosts(
    count: number,
    publishedAt: (i: number) => number = i => i
  ): Promise<string> {
    let feedId = await addFeed(testFeed({ slowReader: 'list' }))
    for (let i = 1; i <= count; i++) {
      await addPost(
        testPost({
          feedId,
          publishedAt: publishedAt(i),
          reading: 'slow',
          title: `${i}`
        })
      )
    }
    return feedId
  }

  test('reads pages', async () => {
    keepMount(slowMenu)
    let categoryId = await addCategory({ title: 'A' })
    let feed1 = await addFeed(
      testFeed({ categoryId, slowReader: 'list', title: 'Feed 1' })
    )
    let feed2 = await addFeed(
      testFeed({ categoryId, slowReader: 'list', title: 'Feed 2' })
    )
    for (let i = 1; i <= 75; i++) {
      await addPost(
        testPost({
          feedId: feed1,
          publishedAt: i,
          reading: 'slow',
          title: `${i}`
        })
      )
    }
    for (let i = 1; i <= 3; i++) {
      await addPost(
        testPost({
          feedId: feed2,
          publishedAt: i,
          reading: 'slow',
          title: `b${i}`
        })
      )
    }

    let page = openPage({ params: { feed: feed2 }, route: 'slow' })
    equal(page.loading.get(), true)
    await waitLoading(page.loading)
    let reader = ensureReader(page.posts, 'list')
    deepEqual(titles(reader), ['b3', 'b2', 'b1'])
    deepEqual(numberPagination(reader).pages.get(), {
      count: 1,
      hasNext: false,
      page: 0,
      pages: [0],
      show: false,
      titles: true
    })

    page = openPage({ params: { feed: feed1 }, route: 'slow' })
    equal(page.loading.get(), false)
    equal(page.postsLoading.get(), true)
    await waitLoading(page.postsLoading)
    reader = ensureReader(page.posts, 'list')
    let pages = numberPagination(reader).pages
    equal(reader.list.get().length, 50)
    equal(reader.list.get()[0]!.title, '75')
    equal(reader.list.get()[49]!.title, '26')
    deepEqual(pages.get(), {
      count: 2,
      hasNext: true,
      page: 0,
      pages: [0, 1],
      show: true,
      titles: true
    })

    await changePost(reader.list.get()[0]!.id, { read: true })
    await changePost(reader.list.get()[5]!.id, { read: true })
    equal(reader.list.get().length, 50)
    deepEqual(slowMenu.get(), [
      [
        { id: categoryId, title: 'A' },
        [
          [{ id: feed1, title: 'Feed 1' }, 73],
          [{ id: feed2, title: 'Feed 2' }, 3]
        ]
      ]
    ])

    // Page cursors are taken on opening, so reading does not renumber pages
    await moveTo(page, '1')
    equal(reader.list.get().length, 25)
    equal(reader.list.get()[0]!.title, '25')
    deepEqual(pages.get(), {
      count: 2,
      hasNext: false,
      page: 1,
      pages: [0, 1],
      show: true,
      titles: true
    })
    await setTimeout(10)

    openPage({ params: { feed: feed2 }, route: 'slow' })
    await setTimeout(10)

    page = openPage({ params: { feed: feed1, from: '1' }, route: 'slow' })
    await waitLoading(page.postsLoading)
    reader = ensureReader(page.posts, 'list')
    pages = numberPagination(reader).pages
    equal(reader.list.get().length, 23)

    await moveTo(page, '0')
    equal(reader.list.get()[49]!.title, '24')

    await reader.readPage()
    equal(page.params.from.get(), '1')
    await waitLoading(page.postsLoading)
    equal(reader.list.get().length, 23)
    equal(pages.get().page, 1)
    equal(pages.get().hasNext, false)
    // The read page keeps its posts with the read style
    await moveTo(page, '0')
    equal(reader.list.get().length, 50)
    equal(
      reader.list.get().every(post => post.read),
      true
    )
    await moveTo(page, '1')
    equal(reader.list.get().length, 23)

    await setTimeout(10)
    deepEqual(slowMenu.get(), [
      [
        { id: categoryId, title: 'A' },
        [
          [{ id: feed1, title: 'Feed 1' }, 23],
          [{ id: feed2, title: 'Feed 2' }, 3]
        ]
      ]
    ])

    // The last page gives the reading back to the menu
    await reader.readPage()
    await setTimeout(10)
    equal(page.params.from.get(), undefined)
    equal(page.params.feed.get(), feed2)
    equal(page.posts.get()?.name, 'list')
  })

  test('does not skip posts changed by another client', async () => {
    let feedId = await addSlowPosts(250)

    let page = openPage({ params: { feed: feedId }, route: 'slow' })
    // Stores are unmounted with a delay, so `currentPage` of the previous
    // test is still mounted: the page was opened with the empty reader
    // of the empty database and `page.loading` is `false` since then
    await waitLoading(page.postsLoading)
    let reader = ensureReader(page.posts, 'list')
    let pages = numberPagination(reader).pages
    equal(pages.get().count, 5)
    let shown = new Set(titles(reader))

    // Another tab or device reads and deletes posts of the next pages
    let ids = new Map(
      (await loadPostsByFeed(feedId)).map(post => [post.title!, post.id])
    )
    let read = ['150', '149', '148']
    let deleted = ['60', '59']
    await changePost(
      read.map(title => ids.get(title)!),
      { read: true }
    )
    await deletePost(deleted.map(title => ids.get(title)!))
    let removed = new Set([...read, ...deleted])

    for (let i = 1; i < pages.get().count; i++) {
      await moveTo(page, `${i}`)
      for (let title of titles(reader)) shown.add(title)
    }

    for (let i = 1; i <= 250; i++) {
      let title = `${i}`
      if (removed.has(title)) continue
      equal(shown.has(title), true, `Post ${title} was skipped`)
    }
  })

  test('shows posts read on the open page', async () => {
    let feedId = await addSlowPosts(3)

    let page = openPage({ params: { feed: feedId }, route: 'slow' })
    await waitLoading(page.postsLoading)
    let reader = ensureReader(page.posts, 'list')
    deepEqual(titles(reader), ['3', '2', '1'])

    await changePost(reader.list.get()[1]!.id, { read: true })
    await setTimeout(10)

    // The post stays on the page and only changes the style
    deepEqual(titles(reader), ['3', '2', '1'])
    deepEqual(
      reader.list.get().map(post => post.read),
      [false, true, false]
    )
  })

  test('splits posts of the same time between pages', async () => {
    let feedId = await addSlowPosts(250, () => 1)

    let page = openPage({ params: { feed: feedId }, route: 'slow' })
    await waitLoading(page.postsLoading)
    let reader = ensureReader(page.posts, 'list')
    let pages = numberPagination(reader).pages
    equal(pages.get().count, 5)

    let shown = new Set(titles(reader))
    for (let i = 1; i < pages.get().count; i++) {
      await moveTo(page, `${i}`)
      for (let title of titles(reader)) shown.add(title)
    }
    equal(shown.size, 250)
  })

  test('reads posts of the category', async () => {
    let categoryId = await addCategory({ title: 'A' })
    let feedId = await addFeed(testFeed({ categoryId }))
    for (let i = 1; i <= 75; i++) {
      await addPost(
        testPost({ feedId, publishedAt: i, reading: 'slow', title: `${i}` })
      )
    }

    let params = createParams()
    let pager = numberPager({ categoryId, reading: 'slow' }, params, 50)
    await waitLoading(pager.loading)
    equal(titles(pager)[0], '75')
    equal(pager.pagination.pages.get().count, 2)
    params.from.set('1')
    await waitLoading(pager.loading)
    equal(titles(pager).length, 25)
    pager.exit()
  })
})
