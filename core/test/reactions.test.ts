import { atom } from 'nanostores'
import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addAccount,
  addFeed,
  addPost,
  client,
  clock,
  deleteAccount,
  deleteFeed,
  deleteOrphanStats,
  getFeedStats,
  getFeedStatsBar,
  getPostReaction,
  getTables,
  likedPosts,
  loadReactedByUrl,
  moveFeed,
  type ReactionValue,
  saveSeen,
  seenBuffer,
  setPostReaction,
  testAccount,
  testFeed,
  testPost,
  trackInterest,
  trackSeen,
  updateMaxSeen,
  userId
} from '../index.ts'
import {
  cleanClient,
  persistentDatabase,
  startClient,
  waitUntil
} from './utils.ts'

const NOW = Math.round(Date.now() / 1000)
const PERIOD = 90 * 86400
const DAY = Math.floor(NOW / 86400)

function loadReactions(): Promise<ReactionValue[]> {
  return getTables().reactions.load`ORDER BY "id"`
}

async function waitReactions(
  check: (rows: ReactionValue[]) => boolean
): Promise<ReactionValue[]> {
  let rows: ReactionValue[] = []
  await waitUntil(async () => {
    rows = await loadReactions()
    return check(rows)
  })
  return rows
}

function withoutTime(rows: ReactionValue[]): Omit<ReactionValue, 'at'>[] {
  return rows.map(({ at, ...row }) => {
    equal(Math.abs(at - NOW) < 60, true)
    return row
  })
}

async function restartApp(): Promise<void> {
  let user = userId.get()!
  userId.set(undefined)
  await waitUntil(() => !client.get())
  // The old client closes the database file after the writes
  await setTimeout(300)
  userId.set(user)
  await waitUntil(() => !!client.get())
}

describe('reactions', () => {
  let unbinds: (() => void)[]

  beforeEach(() => {
    startClient({ databaseCreator: persistentDatabase() })
    unbinds = [likedPosts.listen(() => {})]
  })

  afterEach(async () => {
    for (let unbind of unbinds) unbind()
    seenBuffer.set(null)
    await cleanClient()
  })

  test('sets reaction by user choice', async () => {
    let post = { feedId: 'feed', id: 'post', url: 'https://example.com/1' }
    equal(getPostReaction(undefined), 'none')

    await setPostReaction(post, 'none')
    deepEqual(await loadReactions(), [])

    await setPostReaction(post, 'like')
    deepEqual(withoutTime(await loadReactions()), [
      { feedId: 'feed', id: 'post', type: 'like', url: 'https://example.com/1' }
    ])
    equal(getPostReaction((await loadReactions())[0]), 'like')
    equal((await loadReactedByUrl('https://example.com/1'))!.id, 'post')
    equal(await loadReactedByUrl('https://example.com/2'), undefined)

    await setPostReaction(post, 'dislike')
    equal((await loadReactions())[0]!.type, 'dislike')

    await setPostReaction(post, 'open')
    equal((await loadReactions())[0]!.type, 'open')

    await setPostReaction(post, 'none')
    deepEqual(withoutTime(await loadReactions()), [
      { feedId: 'feed', id: 'post', type: 'none', url: 'https://example.com/1' }
    ])
    equal(getPostReaction((await loadReactions())[0]), 'none')

    await setPostReaction({ feedId: 'feed', id: 'opened' }, 'open')
    deepEqual(withoutTime(await loadReactions())[0], {
      feedId: 'feed',
      id: 'opened',
      type: 'open',
      url: null
    })
  })

  test('tracks interest to posts without a reaction', async () => {
    trackInterest({ feedId: null, id: 'own' }, 'open')
    trackInterest({ id: 'preview' }, 'open')
    trackInterest({ feedId: 'feed', id: 'post' }, 'share')
    let rows = await waitReactions(list => list.length === 1)
    deepEqual(withoutTime(rows), [
      { feedId: 'feed', id: 'post', type: 'share', url: null }
    ])
    equal(getPostReaction(rows[0]), 'open')

    trackInterest({ feedId: 'feed', id: 'post' }, 'link')
    await setPostReaction({ feedId: 'feed', id: 'liked' }, 'like')
    await setPostReaction({ feedId: 'feed', id: 'refused' }, 'open')
    await setPostReaction({ feedId: 'feed', id: 'refused' }, 'none')
    trackInterest({ feedId: 'feed', id: 'liked' }, 'open')
    trackInterest({ feedId: 'feed', id: 'refused' }, 'open')
    await setTimeout(50)
    deepEqual(
      (await loadReactions()).map(row => row.type),
      ['like', 'share', 'none']
    )
  })

  test('gives reactions of saved posts for cards', async () => {
    let feed = await addFeed(testFeed())
    let post1 = await addPost(testPost({ feedId: feed }))
    let post2 = await addPost(testPost({ feedId: feed }))
    let post3 = await addPost(testPost({ feedId: feed }))
    await waitUntil(() => !!likedPosts.get())
    deepEqual([...likedPosts.get()!], [])

    await setPostReaction({ feedId: feed, id: post1 }, 'like')
    await setPostReaction({ feedId: feed, id: post2 }, 'dislike')
    await setPostReaction({ feedId: feed, id: 'deleted' }, 'like')
    trackInterest({ feedId: feed, id: post3 }, 'open')
    await waitReactions(rows => rows.length === 4)

    deepEqual(
      [...likedPosts.get()!].toSorted(([a], [b]) => a.localeCompare(b)),
      [
        [post1, true],
        [post2, false]
      ]
    )
  })

  test('counts statistics of asked feeds for 90 days', async t => {
    await getTables().reactions.create([
      { at: NOW, feedId: 'a', id: '1', type: 'like' },
      { at: (DAY - 89) * 86400, feedId: 'a', id: '2', type: 'like' },
      { at: (DAY - 89) * 86400 - 1, feedId: 'a', id: '3', type: 'like' },
      { at: NOW, feedId: 'a', id: '4', type: 'dislike' },
      { at: NOW, feedId: 'a', id: '5', type: 'open' },
      { at: NOW, feedId: 'a', id: '6', type: 'link' },
      { at: NOW, feedId: 'b', id: '7', type: 'share' },
      { at: NOW, feedId: 'a', id: '8', type: 'none' },
      { at: NOW, feedId: 'd', id: '9', type: 'none' }
    ])
    await getTables().views.create([
      { day: DAY - 1, days: [{ count: 7, day: DAY - 1 }], feedId: 'a' },
      { day: DAY - 1, days: [{ count: 20, day: DAY - 1 }], feedId: 'other' }
    ])
    trackSeen('a', 3)
    await updateMaxSeen()

    let ids = atom(['a', 'b', 'new'])
    let stats = getFeedStats(ids)
    t.after(stats.listen(() => {}))
    await waitUntil(() => stats.get().get('a')?.max === 20)
    deepEqual(Object.fromEntries(stats.get()), {
      a: { disliked: 1, liked: 2, max: 20, opened: 2, seen: 10 },
      b: { disliked: 0, liked: 0, max: 20, opened: 1, seen: 0 },
      new: { disliked: 0, liked: 0, max: 20, opened: 0, seen: 0 }
    })

    deepEqual(getFeedStatsBar(stats.get().get('a')!), {
      parts: [
        { count: 2, type: 'liked' },
        { count: 2, type: 'opened' },
        { count: 5, type: 'other' },
        { count: 1, type: 'disliked' }
      ],
      total: 10,
      width: 50
    })
    deepEqual(getFeedStatsBar(stats.get().get('b')!), {
      parts: [{ count: 1, type: 'opened' }],
      total: 1,
      width: 5
    })
    deepEqual(getFeedStatsBar(stats.get().get('new')!), {
      parts: [],
      total: 0,
      width: 0
    })
    equal(
      getFeedStatsBar({ disliked: 0, liked: 0, max: 0, opened: 0, seen: 0 })
        .width,
      0
    )
    equal(
      getFeedStatsBar({ disliked: 0, liked: 0, max: 5, opened: 0, seen: 10 })
        .width,
      100
    )

    let before = stats.get()
    ids.set(['a', 'b', 'new'])
    equal(stats.get(), before)

    ids.set(['b'])
    await waitUntil(() => stats.get().get('b')?.opened === 1)
    deepEqual(Object.fromEntries(stats.get()), {
      b: { disliked: 0, liked: 0, max: 20, opened: 1, seen: 0 }
    })
  })

  test('grows the scale to feeds on the screen', async t => {
    let stats = getFeedStats(atom(['a', 'b']))
    t.after(stats.listen(() => {}))
    trackSeen('a', 4)
    deepEqual(Object.fromEntries(stats.get()), {
      a: { disliked: 0, liked: 0, max: 4, opened: 0, seen: 4 },
      b: { disliked: 0, liked: 0, max: 4, opened: 0, seen: 0 }
    })

    await getTables().reactions.create(
      ['1', '2', '3', '4', '5', '6'].map(id => {
        return { at: NOW, feedId: 'b', id, type: 'open' as const }
      })
    )
    await waitUntil(() => stats.get().get('b')?.max === 6)
    equal(stats.get().get('a')!.max, 6)
  })

  test('moves the period on the next day', async t => {
    t.after(() => {
      t.mock.timers.reset()
      clock.set(new Date())
    })
    t.mock.timers.enable({ apis: ['Date'], now: DAY * 86_400_000 })
    await getTables().reactions.create([
      { at: (DAY - 89) * 86400, feedId: 'a', id: '1', type: 'like' },
      { at: (DAY - 88) * 86400, feedId: 'a', id: '2', type: 'like' }
    ])
    await getTables().views.create([
      {
        day: DAY - 88,
        days: [
          { count: 16, day: DAY - 89 },
          { count: 8, day: DAY - 88 }
        ],
        feedId: 'other'
      },
      {
        day: DAY - 88,
        days: [
          { count: 4, day: DAY - 89 },
          { count: 2, day: DAY - 88 }
        ],
        feedId: 'a'
      }
    ])
    await updateMaxSeen()

    let stats = getFeedStats(atom(['a']))
    t.after(stats.listen(() => {}))
    await waitUntil(() => stats.get().get('a')?.liked === 2)
    deepEqual(stats.get().get('a'), {
      disliked: 0,
      liked: 2,
      max: 24,
      opened: 0,
      seen: 6
    })

    t.mock.timers.setTime((DAY + 1) * 86_400_000)
    clock.set(new Date())
    await waitUntil(() => stats.get().get('a')?.max === 8)
    await waitUntil(() => stats.get().get('a')?.liked === 1)
    deepEqual(stats.get().get('a'), {
      disliked: 0,
      liked: 1,
      max: 8,
      opened: 0,
      seen: 2
    })
  })

  test('deletes old reactions set by the app on start', async () => {
    await getTables().reactions.create([
      { at: NOW - PERIOD - 60, feedId: 'a', id: 'like', type: 'like' },
      { at: NOW - PERIOD - 60, feedId: 'a', id: 'none', type: 'none' },
      { at: NOW - PERIOD - 60, feedId: 'a', id: 'old', type: 'open' },
      { at: NOW - PERIOD + 600, feedId: 'a', id: 'recent', type: 'open' }
    ])
    // Database is closed only after it was created
    equal((await loadReactions()).length, 4)

    await restartApp()
    let rows = await waitReactions(list => list.length === 2)
    deepEqual(
      rows.map(row => row.id),
      ['like', 'recent']
    )
  })

  test('deletes statistics with the feed', async t => {
    let feed1 = await addFeed(testFeed())
    let feed2 = await addFeed(testFeed())
    await setPostReaction({ feedId: feed1, id: '1' }, 'like')
    await setPostReaction({ feedId: feed2, id: '2' }, 'like')
    await getTables().views.create([
      {
        day: DAY - 1,
        days: [{ count: 1, day: DAY - 1 }],
        feedId: feed1,
        id: 'other:1'
      },
      {
        day: DAY - 1,
        days: [{ count: 2, day: DAY - 1 }],
        feedId: feed2,
        id: 'other:2'
      }
    ])
    trackSeen(feed1, 1)
    trackSeen(feed2, 1)

    await deleteFeed(feed1)
    deepEqual(
      (await loadReactions()).map(row => row.id),
      ['2']
    )
    deepEqual(seenBuffer.get()!.feeds, { [feed2]: 1 })
    deepEqual(
      (await getTables().views.load()).map(row => row.id),
      ['other:2']
    )
    let stats = getFeedStats(atom([feed1, feed2]))
    t.after(stats.listen(() => {}))
    await waitUntil(() => stats.get().get(feed2)?.liked === 1)
    deepEqual(Object.fromEntries(stats.get()), {
      [feed1]: { disliked: 0, liked: 0, max: 3, opened: 0, seen: 0 },
      [feed2]: { disliked: 0, liked: 1, max: 3, opened: 0, seen: 3 }
    })
  })

  test('moves statistics to another feed', async () => {
    let from = testFeed()
    let to = testFeed()
    await addFeed([from, to])
    await setPostReaction({ feedId: from.id, id: '1' }, 'like')
    await setPostReaction({ feedId: to.id, id: '2' }, 'dislike')
    trackSeen(from.id, 1)
    trackSeen(to.id, 2)

    await moveFeed(from, { title: to.title, url: to.url })
    deepEqual(
      (await loadReactions()).map(row => row.feedId),
      [to.id, to.id]
    )
    deepEqual(seenBuffer.get()!.feeds, { [to.id]: 2 })
    deepEqual(
      (await getTables().views.load()).map(row => row.feedId),
      [to.id, to.id]
    )
    deepEqual(
      (await getTables().views.load())
        .map(row => row.days[0]!.count)
        .toSorted((a, b) => a - b),
      [1, 2]
    )
  })

  test('deletes statistics with the account', async () => {
    let account = await addAccount(testAccount())
    let virtual = await addFeed(testFeed({ accountId: account }))
    let normal = await addFeed(testFeed())
    await setPostReaction({ feedId: virtual, id: '1' }, 'like')
    await setPostReaction({ feedId: normal, id: '2' }, 'like')
    trackSeen(virtual, 1)
    trackSeen(normal, 1)

    await deleteAccount(account)
    deepEqual(
      (await loadReactions()).map(row => row.id),
      ['2']
    )
    deepEqual(seenBuffer.get()!.feeds, { [normal]: 1 })
  })

  test('deletes statistics of missing feeds', async () => {
    let feed = await addFeed(testFeed())
    await setPostReaction({ feedId: feed, id: '1' }, 'like')
    await setPostReaction({ feedId: 'missing', id: '2' }, 'like')
    trackSeen(feed, 1)
    trackSeen('missing', 1)
    saveSeen()

    await deleteOrphanStats()
    deepEqual(
      (await loadReactions()).map(row => row.id),
      ['1']
    )
    deepEqual(seenBuffer.get()!.feeds, { [feed]: 1 })
    deepEqual(
      (await getTables().views.load()).map(row => row.feedId),
      [feed]
    )
  })
})
