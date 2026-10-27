import { atom } from 'nanostores'
import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addAccount,
  addCategory,
  addFeed,
  addPost,
  changeRead,
  type FeedReader,
  getFeedAuthor,
  hasUnreadPosts,
  listReader,
  loadPost,
  testAccount,
  testFeed,
  testPost,
  toPreviewPost,
  waitLoading
} from '../../index.ts'
import { loadReadPostIds } from '../../readers/common.ts'
import {
  cleanClient,
  numberPagination,
  ensureReader,
  openPage,
  openRoute,
  nextPagination,
  startClient
} from '../utils.ts'

function titles(reader: FeedReader): string[] {
  return reader.list.get().map(post => post.title!)
}

describe('feed reader', () => {
  beforeEach(() => {
    startClient()
  })

  afterEach(async () => {
    // Without it the page of the test will be mounted during the next test
    openRoute({ params: {}, route: 'about' })
    await cleanClient()
  })

  test('loads authors of the category', async () => {
    let categoryId = await addCategory({ fastReader: 'feed', title: 'A' })
    let feed1 = await addFeed(testFeed({ categoryId, fastReader: 'feed' }))
    let feed2 = await addFeed(testFeed({ categoryId, fastReader: 'feed' }))
    for (let i = 1; i <= 4; i++) {
      await addPost(
        testPost({
          feedId: i % 2 === 0 ? feed1 : feed2,
          publishedAt: i,
          reading: 'fast'
        })
      )
    }

    let page = openPage({ params: { category: categoryId }, route: 'fast' })
    await waitLoading(page.loading)
    let reader = ensureReader(page.posts, 'feed')
    equal(reader.authors.get().size, 2)
    equal(reader.authors.get().get(feed1)!.title, 'Test 1')
    equal(reader.authors.get().get(feed2)!.url, 'http://example.com/2')
    equal(reader.authors.get().get(feed2)!.feedId, feed2)
  })

  test('picks pager by reading', async () => {
    let categoryId = await addCategory({ fastReader: 'feed', title: 'A' })
    let fast = await addFeed(testFeed({ categoryId, fastReader: 'feed' }))
    let slow = await addFeed(testFeed({ slowReader: 'feed' }))
    for (let i = 1; i <= 25; i++) {
      await addPost(testPost({ feedId: fast, publishedAt: i, reading: 'fast' }))
      await addPost(testPost({ feedId: slow, publishedAt: i, reading: 'slow' }))
    }

    let page = openPage({ params: { category: categoryId }, route: 'fast' })
    await waitLoading(page.postsLoading)
    let reader = ensureReader(page.posts, 'feed')
    equal(reader.list.get().length, 20)
    equal(nextPagination(reader).hasNext.get(), true)

    page = openPage({ params: { feed: slow }, route: 'slow' })
    await waitLoading(page.postsLoading)
    reader = ensureReader(page.posts, 'feed')
    equal(reader.list.get().length, 20)
    equal(numberPagination(reader).pages.get().count, 2)
  })

  test('loads intro without the whole article', async () => {
    let feedId = await addFeed(testFeed({ slowReader: 'feed' }))
    for (let post of [
      { full: 'Full article', intro: 'Intro', publishedAt: 4 },
      { full: 'Same', intro: 'Same', publishedAt: 3 },
      { full: 'Short article', intro: null, publishedAt: 2 },
      { full: 'a'.repeat(6000), intro: '', publishedAt: 1 }
    ]) {
      await addPost(testPost({ feedId, reading: 'slow', ...post }))
    }

    let page = openPage({
      params: { feed: feedId },
      route: 'slow'
    })
    await waitLoading(page.postsLoading)
    let reader = ensureReader(page.posts, 'feed')
    equal(reader.authors.get().size, 0)
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

  test('loads media with their sizes', async () => {
    let feedId = await addFeed(testFeed({ slowReader: 'feed' }))
    let first = { type: 'image', url: 'https://example.com/a.png' }
    let second = { type: 'image', url: 'https://example.com/b.png' }
    await addPost(
      testPost({
        feedId,
        media: [first, second],
        mediaSizes: [{ height: 10, width: 20 }, null],
        publishedAt: 2,
        reading: 'slow'
      })
    )
    await addPost(testPost({ feedId, publishedAt: 1, reading: 'slow' }))

    let page = openPage({ params: { feed: feedId }, route: 'slow' })
    await waitLoading(page.postsLoading)
    let reader = ensureReader(page.posts, 'feed')
    deepEqual(
      reader.list.get().map(post => post.media),
      [[{ ...first, size: { height: 10, width: 20 } }, second], []]
    )
  })

  test('loads social fields', async () => {
    let feedId = await addFeed(testFeed({ slowReader: 'feed' }))
    let social = {
      author: { title: 'Author' },
      preview: { url: 'https://example.com/' },
      quoted: { missing: true },
      repostedBy: { title: 'Reposter' },
      unsupported: true,
      warning: 'Spoiler'
    }
    await addPost(testPost({ feedId, reading: 'slow', ...social }))

    let page = openPage({ params: { feed: feedId }, route: 'slow' })
    await waitLoading(page.postsLoading)
    let post = ensureReader(page.posts, 'feed').list.get()[0]!
    deepEqual(
      {
        author: post.author,
        preview: post.preview,
        quoted: post.quoted,
        repostedBy: post.repostedBy,
        unsupported: post.unsupported,
        warning: post.warning
      },
      social
    )
  })

  test('reads account posts', async () => {
    let categoryId = await addCategory({ fastReader: 'feed', title: 'A' })
    let other = await addCategory({ title: 'B' })
    let feedId = await addFeed(testFeed({ categoryId, loader: 'mastodon' }))
    let accountId = await addAccount(testAccount({ categoryId }))
    let otherAccount = await addAccount(testAccount({ categoryId: other }))
    function accountPost(
      id: string,
      sortedAt: number,
      fields: Parameters<typeof testPost>[0] = {}
    ): ReturnType<typeof testPost> {
      return testPost({
        accountId,
        author: { title: 'Bob', url: 'https://bob.social/@bob' },
        feedId: null,
        id,
        publishedAt: sortedAt,
        reading: 'fast',
        title: id,
        ...fields
      })
    }
    await addPost([
      testPost({
        feedId,
        id: 'f1',
        publishedAt: 1,
        reading: 'fast',
        title: 'f1'
      }),
      accountPost('a1', 3, { threadId: 'a1' }),
      accountPost('a2', 4, { merged: true, threadId: 'a1' }),
      accountPost('a3', 2),
      accountPost('o1', 5, { accountId: otherAccount })
    ])

    let page = openPage({ params: { category: categoryId }, route: 'fast' })
    await waitLoading(page.loading)
    let reader = ensureReader(page.posts, 'feed')
    deepEqual(titles(reader), ['a1', 'a3', 'f1'])
    deepEqual([...reader.authors.get().keys()], [feedId])
    let authors = reader.authors.get()
    let [first, , feedPost] = reader.list.get()
    equal(getFeedAuthor(first!, authors), undefined)
    equal(getFeedAuthor(feedPost!, authors)?.feedId, feedId)
    equal(getFeedAuthor(feedPost!, authors)?.round, true)
    equal(getFeedAuthor(feedPost!, undefined), undefined)
    equal(
      getFeedAuthor(toPreviewPost({ id: 'preview', originId: 'p' }), authors),
      undefined
    )
    equal(reader.list.get()[0]!.threadSize, 2)
    equal(reader.list.get()[0]!.author?.title, 'Bob')

    let params = {
      category: atom<string | undefined>(),
      feed: atom<string | undefined>(),
      from: atom<string | undefined>()
    }
    let filter = { categoryId, reading: 'fast' as const }
    equal(await hasUnreadPosts('fast', { categoryId }), true)
    let list = listReader(filter, params)!
    await waitLoading(list.loading)
    deepEqual(
      list.list.get().map(post => post.title),
      ['a1', 'a3', 'f1']
    )

    await changeRead(['a1'], true)
    await setTimeout(10)
    equal(list.list.get()[0]!.read, true)
    deepEqual((await loadReadPostIds(filter)).toSorted(), ['a1', 'a2'])
    list.exit()

    await reader.readPage()
    await setTimeout(10)
    equal(await hasUnreadPosts('fast', { categoryId }), false)
    equal((await loadPost('o1'))!.read, false)
  })
})
