import { restoreAll, spyOn } from 'nanospy'
import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  addFeed,
  addPost,
  changeRead,
  collapseThreads,
  createDownloadTask,
  createPostsList,
  getPostId,
  hasUnreadPosts,
  loaders,
  loadPost,
  loadPosts,
  loadThreadPosts,
  type OriginPost,
  processOriginPost,
  testFeed,
  testPost
} from '../index.ts'
import { loadPostsPage, topCursor } from '../readers/common.ts'
import { addThreadStarts, linkThreads } from '../thread.ts'
import { cleanClient, startClient } from './utils.ts'

const URL = 'https://mastodon.social/@jane'

// Spy needs the optional method to be required
let mastodon = loaders.mastodon as Required<typeof loaders.mastodon>

async function prepareFeed(): Promise<{
  id: string
  loader: 'mastodon'
  url: string
}> {
  let id = await addFeed(testFeed({ loader: 'mastodon', url: URL }))
  return { id, loader: 'mastodon', url: URL }
}

function origin(
  originId: string,
  fields: Partial<OriginPost> = {}
): OriginPost {
  return { id: originId, originId, ...fields }
}

function short(posts: OriginPost[]): unknown[][] {
  return posts.map(post => [
    post.originId,
    post.merged,
    post.threadId,
    post.sortedAt
  ])
}

function stored(
  feedId: string,
  originId: string,
  fields: Parameters<typeof testPost>[0] = {}
): ReturnType<typeof testPost> {
  return testPost({
    feedId,
    id: getPostId(feedId, origin(originId)),
    originId,
    ...fields
  })
}

describe('threads', () => {
  beforeEach(() => {
    startClient()
  })

  afterEach(async () => {
    restoreAll()
    await cleanClient()
  })

  test('links threads inside new posts', async () => {
    let feed = await prepareFeed()
    let ancestors = spyOn(mastodon, 'getThreadAncestors')
    let linked = await linkThreads(createDownloadTask(), feed, [
      origin('3', { publishedAt: 3, selfReplyTo: '2' }),
      origin('4', { publishedAt: 4 }),
      origin('2', { publishedAt: 2, selfReplyTo: '1' }),
      origin('1', { publishedAt: 1 }),
      origin('5')
    ])
    equal(ancestors.callCount, 0)
    deepEqual(short(linked), [
      ['3', true, '1', undefined],
      ['4', undefined, undefined, undefined],
      ['2', true, '1', undefined],
      ['1', false, '1', 3],
      ['5', undefined, undefined, undefined]
    ])
    equal(
      linked.some(post => 'selfReplyTo' in post),
      false
    )

    linked = await linkThreads(createDownloadTask(), feed, [
      origin('7', { selfReplyTo: '6' }),
      origin('6')
    ])
    deepEqual(short(linked), [
      ['7', true, '6', undefined],
      ['6', false, '6', undefined]
    ])
  })

  test('continues stored threads', async () => {
    let feed = await prepareFeed()
    await addPost([
      stored(feed.id, 's', { publishedAt: 1, read: true, threadId: 's' }),
      stored(feed.id, 'p', {
        merged: true,
        publishedAt: 2,
        read: true,
        threadId: 's'
      }),
      stored(feed.id, 'x', { publishedAt: 3 })
    ])
    let linked = await linkThreads(createDownloadTask(), feed, [
      origin('n1', { publishedAt: 10, selfReplyTo: 'p' }),
      origin('n2', { publishedAt: 11, selfReplyTo: 'x' })
    ])
    deepEqual(short(linked), [
      ['n1', true, 's', undefined],
      ['n2', true, 'x', undefined]
    ])
    let start = await loadPost(getPostId(feed.id, origin('s')))
    equal(start!.read, false)
    equal(start!.merged, false)
    equal(start!.sortedAt, 10)
    let single = await loadPost(getPostId(feed.id, origin('x')))
    equal(single!.threadId, 'x')
    equal(single!.sortedAt, 11)

    await addPost(
      linked.map(post => processOriginPost(post, { feedId: feed.id }, 'slow'))
    )
    await linkThreads(createDownloadTask(), feed, [
      origin('old', { publishedAt: 5, selfReplyTo: 'n1' })
    ])
    equal((await loadPost(getPostId(feed.id, origin('s'))))!.sortedAt, 10)
  })

  test('restores earlier posts of the thread', async () => {
    let feed = await prepareFeed()
    let ancestors = spyOn(mastodon, 'getThreadAncestors', () => {
      return Promise.resolve([
        { originId: 'a', publishedAt: 1 },
        { originId: 'b', publishedAt: 2, selfReplyTo: 'a' }
      ])
    })
    let linked = await linkThreads(createDownloadTask(), feed, [
      origin('c', { publishedAt: 3, selfReplyTo: 'b' })
    ])
    deepEqual(ancestors.calls[0]!.slice(1), [URL, 'c'])
    deepEqual(short(linked), [
      ['c', true, 'a', undefined],
      ['a', false, 'a', 3],
      ['b', true, 'a', undefined]
    ])

    await addPost(stored(feed.id, 'a', { publishedAt: 1, read: true }))
    ancestors.nextResult(
      Promise.resolve([
        { originId: 'a', publishedAt: 1 },
        { originId: 'b2', publishedAt: 2, selfReplyTo: 'a' }
      ])
    )
    linked = await linkThreads(createDownloadTask(), feed, [
      origin('d', { publishedAt: 4, selfReplyTo: 'b2' })
    ])
    deepEqual(short(linked), [
      ['d', true, 'a', undefined],
      ['b2', true, 'a', undefined]
    ])
    let start = await loadPost(getPostId(feed.id, origin('a')))
    equal(start!.read, false)
    equal(start!.threadId, 'a')
    equal(start!.sortedAt, 4)

    ancestors.nextResult(Promise.resolve([{ originId: 'e' }]))
    linked = await linkThreads(createDownloadTask(), feed, [
      origin('e', { publishedAt: 1 }),
      origin('f', { publishedAt: 2, selfReplyTo: 'g' })
    ])
    deepEqual(short(linked), [
      ['e', false, 'e', 2],
      ['f', true, 'e', undefined]
    ])

    ancestors.nextResult(Promise.resolve([]))
    linked = await linkThreads(createDownloadTask(), feed, [
      origin('h', { selfReplyTo: 'i' })
    ])
    deepEqual(short(linked), [['h', undefined, undefined, undefined]])
  })

  test('collapses threads of the feed preview', () => {
    let list = collapseThreads([
      origin('3', { publishedAt: 3, selfReplyTo: '2' }),
      origin('4', { publishedAt: 4 }),
      origin('2', { publishedAt: 2, selfReplyTo: '1' }),
      origin('1', { publishedAt: 1 }),
      origin('6', { selfReplyTo: '5' }),
      origin('8', { selfReplyTo: '7' }),
      origin('7')
    ])
    deepEqual(
      list.map(post => [
        post.originId,
        post.threadParts?.map(part => part.originId)
      ]),
      [
        ['1', ['2', '3']],
        ['4', undefined],
        ['6', undefined],
        ['7', ['8']]
      ]
    )
  })

  test('loads thread starts for the feed preview', async () => {
    let ancestors = spyOn(mastodon, 'getThreadAncestors', () => {
      return Promise.resolve([
        { originId: 'a', publishedAt: 1 },
        { originId: 'b', publishedAt: 2, selfReplyTo: 'a' }
      ])
    })
    let pages = createPostsList(() => [
      [
        { originId: 'd', publishedAt: 4 },
        { originId: 'c', publishedAt: 3, selfReplyTo: 'b' },
        { originId: 'b', publishedAt: 2, selfReplyTo: 'a' },
        { originId: 'x', selfReplyTo: 'y' }
      ],
      () => {
        return Promise.resolve([
          [
            { originId: 'a', publishedAt: 1 },
            { originId: 'e', selfReplyTo: 'z' }
          ],
          () => Promise.reject(new Error('Broken page'))
        ])
      }
    ])
    let preview = createPostsList(
      addThreadStarts(createDownloadTask(), mastodon, URL, pages)
    )
    function shown(): unknown[] {
      return collapseThreads(preview.get().list).map(post => [
        post.originId,
        post.threadParts?.map(part => part.originId)
      ])
    }

    await preview.loading
    deepEqual(
      ancestors.calls.map(call => call[2]),
      ['b', 'x']
    )
    deepEqual(shown(), [
      ['d', undefined],
      ['a', ['b', 'c']],
      ['x', undefined]
    ])

    ancestors.nextResult(Promise.reject(new Error('No context')))
    await preview.next()
    deepEqual(shown(), [
      ['d', undefined],
      ['a', ['b', 'c']],
      ['x', undefined],
      ['e', undefined]
    ])

    await preview.next()
    equal(preview.get().error?.message, 'Broken page')
    equal(preview.get().list.length, 6)
  })

  test('shows thread as its first post', async () => {
    let feed = await prepareFeed()
    let linked = await linkThreads(createDownloadTask(), feed, [
      origin('3', { full: 'Third', publishedAt: 3, selfReplyTo: '1' }),
      origin('2', { publishedAt: 2 }),
      origin('1', { full: 'First', publishedAt: 1 })
    ])
    await addPost(
      linked.map(post => processOriginPost(post, { feedId: feed.id }, 'slow'))
    )
    let filter = { feedId: feed.id, reading: 'slow' as const }

    let page = await loadPostsPage(filter, topCursor(), 10)
    deepEqual(
      page.map(post => [post.originId, post.threadSize, post.full]),
      [
        ['1', 2, 'First'],
        ['2', 0, null]
      ]
    )
    deepEqual(
      (await loadThreadPosts(feed.id, '1')).map(post => post.originId),
      ['1', '3']
    )

    await changeRead([page[1]!.id], true)
    equal(await hasUnreadPosts('slow', { feedId: feed.id }), true)
    await changeRead([page[0]!.id], true)
    equal(await hasUnreadPosts('slow', { feedId: feed.id }), false)
    deepEqual(
      (await loadPosts()).map(post => post.read),
      [true, true, true]
    )
  })
})
