import { restoreAll, spyOn } from 'nanospy'
import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addFeed,
  addPost,
  changeRead,
  client,
  deleteSeen,
  downloadingCloudData,
  flushSeen,
  getSeen,
  getTables,
  maxSeen,
  moveSeen,
  updateMaxSeen,
  saveSeen,
  seenBuffer,
  testFeed,
  testPost,
  trackSeen,
  userId,
  type ViewValue
} from '../index.ts'
import {
  cleanClient,
  exitTestApp,
  persistentDatabase,
  setTestVisibility,
  startClient,
  waitUntil
} from './utils.ts'

const TODAY = Math.floor(Date.now() / 86_400_000)

function loadViews(): Promise<ViewValue[]> {
  return getTables().views.load`ORDER BY "feedId", "id"`
}

function ownRow(feedId: string): string {
  return `${seenBuffer.get()!.device}:${feedId}`
}

async function waitViews(
  check: (rows: ViewValue[]) => boolean
): Promise<ViewValue[]> {
  let rows: ViewValue[] = []
  await waitUntil(async () => {
    rows = await loadViews()
    return check(rows)
  })
  return rows
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

describe('views', () => {
  beforeEach(() => {
    startClient({ databaseCreator: persistentDatabase() })
  })

  afterEach(async () => {
    seenBuffer.set(null)
    await cleanClient()
  })

  test('counts posts, which user read', async t => {
    let feed1 = await addFeed(testFeed())
    let feed2 = await addFeed(testFeed())
    let seen = getSeen([feed1, feed2], TODAY)
    t.after(seen.listen(() => {}))
    let post1 = await addPost(testPost({ feedId: feed1 }))
    let post2 = await addPost(testPost({ feedId: feed1 }))
    let post3 = await addPost(testPost({ feedId: feed2 }))
    let own = await addPost(testPost({ accountId: 'account', feedId: null }))

    await changeRead([post1, post2, post3, own], true)
    deepEqual(seenBuffer.get()!.feeds, { [feed1]: 2, [feed2]: 1 })
    deepEqual(Object.fromEntries(seen.get()), { [feed1]: 2, [feed2]: 1 })
    deepEqual(await loadViews(), [])

    await changeRead([post1], true)
    equal(seenBuffer.get()!.feeds[feed1], 2)

    await changeRead([post1, post3], false)
    deepEqual(seenBuffer.get()!.feeds, { [feed1]: 1, [feed2]: 0 })

    setTestVisibility(true)
    deepEqual(await loadViews(), [])

    setTestVisibility(false)
    deepEqual(await waitViews(rows => rows.length === 1), [
      {
        day: TODAY,
        days: [{ count: 1, day: TODAY }],
        feedId: feed1,
        id: ownRow(feed1)
      }
    ])

    await changeRead([post3], true)
    exitTestApp()
    let rows = await waitViews(list => list.length === 2)
    deepEqual(
      rows.find(row => row.feedId === feed2),
      {
        day: TODAY,
        days: [{ count: 1, day: TODAY }],
        feedId: feed2,
        id: ownRow(feed2)
      }
    )
    await waitUntil(() => seenBuffer.get()!.saved[feed2] === 1)
    await waitUntil(() => seen.get().get(feed2) === 1)
    deepEqual(Object.fromEntries(seen.get()), { [feed1]: 1, [feed2]: 1 })
  })

  test('counts merged thread once', async () => {
    let feed = await addFeed(testFeed())
    let start = await addPost(
      testPost({ feedId: feed, originId: 'a', threadId: 'a' })
    )
    await addPost(
      testPost({ feedId: feed, merged: true, originId: 'b', threadId: 'a' })
    )

    await changeRead([start], true)
    deepEqual(seenBuffer.get()!.feeds, { [feed]: 1 })
  })

  test('saves counters by timer', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] })
    trackSeen('feed', 1)
    trackSeen('feed', 1)
    t.mock.timers.tick(59_000)
    await setTimeout(10)
    deepEqual(await loadViews(), [])
    deepEqual(seenBuffer.get()!.saved, {})
    t.mock.timers.tick(1_000)
    t.mock.timers.reset()

    let rows = await waitViews(list => list.length === 1)
    deepEqual(rows[0]!.days, [{ count: 2, day: TODAY }])
    await waitUntil(() => seenBuffer.get()!.saved.feed === 2)
  })

  test('keeps posts read during the write as unsaved', async t => {
    let seen = getSeen(['a', 'b'], TODAY)
    t.after(seen.listen(() => {}))
    trackSeen('a', 1)
    saveSeen()
    await waitUntil(() => seenBuffer.get()!.saved.a === 1)

    let views = getTables().views
    let load = views.load.bind(views)
    spyOn(views, 'load', (...args: Parameters<typeof load>) => {
      restoreAll()
      trackSeen('a', 2)
      trackSeen('b', 4)
      return load(...args)
    })
    t.after(restoreAll)

    trackSeen('a', 8)
    saveSeen()
    await waitUntil(() => seenBuffer.get()!.saved.a === 9)
    deepEqual(seenBuffer.get()!.saved, { a: 9 })
    deepEqual(seenBuffer.get()!.feeds, { a: 11, b: 4 })
    await waitUntil(() => seen.get().get('a') === 11)
    deepEqual(Object.fromEntries(seen.get()), { a: 11, b: 4 })

    saveSeen()
    let rows = await waitViews(list => list.length === 2)
    deepEqual(
      rows.map(row => row.days),
      [[{ count: 11, day: TODAY }], [{ count: 4, day: TODAY }]]
    )
  })

  test('sums last 90 days of all devices', async t => {
    let seen = getSeen(['a', 'b', 'c'], TODAY)
    t.after(seen.listen(() => {}))
    await getTables().views.create([
      {
        day: TODAY,
        days: [
          { count: 8, day: TODAY - 90 },
          { count: 2, day: TODAY - 89 },
          { count: 1, day: TODAY }
        ],
        feedId: 'a'
      },
      { day: TODAY - 89, days: [{ count: 4, day: TODAY - 89 }], feedId: 'b' },
      { day: TODAY, days: [{ count: 64, day: TODAY }], feedId: 'other' }
    ])
    trackSeen('a', 16)
    saveSeen()
    await waitUntil(() => seenBuffer.get()!.saved.a === 16)
    trackSeen('a', 32)

    await waitUntil(() => seen.get().get('a') === 51)
    deepEqual(Object.fromEntries(seen.get()), { a: 51, b: 4 })
    await updateMaxSeen()
    equal(maxSeen.get(), 64)

    trackSeen('a', -40)
    deepEqual(Object.fromEntries(seen.get()), { a: 11, b: 4 })
  })

  test('starts new buffer every hour', async t => {
    t.mock.timers.enable({ apis: ['Date'], now: TODAY * 86_400_000 })
    trackSeen('a', 1)
    trackSeen('b', 4)
    let device = seenBuffer.get()!.device

    t.mock.timers.setTime(TODAY * 86_400_000 + 3_600_000)
    trackSeen('a', 2)
    deepEqual(seenBuffer.get(), {
      base: {},
      device,
      feeds: { a: 2 },
      hour: TODAY * 24 + 1,
      saved: {}
    })
    t.mock.timers.reset()
    saveSeen()

    await waitUntil(() => seenBuffer.get()!.saved.a === 2)
    deepEqual(seenBuffer.get()!.base, { a: 1 })
    deepEqual(await loadViews(), [
      {
        day: TODAY,
        days: [{ count: 3, day: TODAY }],
        feedId: 'a',
        id: `${device}:a`
      },
      {
        day: TODAY,
        days: [{ count: 4, day: TODAY }],
        feedId: 'b',
        id: `${device}:b`
      }
    ])
  })

  test('removes old days from own row', async () => {
    trackSeen('a', 1)
    await getTables().views.create({
      day: TODAY - 1,
      days: [
        { count: 5, day: TODAY - 90 },
        { count: 7, day: TODAY - 89 }
      ],
      feedId: 'a',
      id: ownRow('a')
    })
    saveSeen()

    await waitUntil(() => seenBuffer.get()!.saved.a === 1)
    deepEqual(await loadViews(), [
      {
        day: TODAY,
        days: [
          { count: 7, day: TODAY - 89 },
          { count: 1, day: TODAY }
        ],
        feedId: 'a',
        id: ownRow('a')
      }
    ])

    trackSeen('a', -1)
    saveSeen()
    await waitUntil(() => seenBuffer.get()!.saved.a === 0)
    deepEqual((await loadViews())[0]!.days, [{ count: 7, day: TODAY - 89 }])
  })

  test('does not save during the download of cloud data', async t => {
    t.after(() => {
      downloadingCloudData.set(false)
    })
    trackSeen('a', 1)
    downloadingCloudData.set(true)
    await flushSeen()
    deepEqual(await loadViews(), [])

    downloadingCloudData.set(false)
    await flushSeen()
    deepEqual((await loadViews())[0]!.days, [{ count: 1, day: TODAY }])
  })

  test('saves counters of closed app and deletes old rows', async () => {
    await getTables().views.create([
      {
        day: TODAY - 90,
        days: [{ count: 1, day: TODAY - 90 }],
        feedId: 'a',
        id: 'old'
      },
      {
        day: TODAY - 89,
        days: [{ count: 1, day: TODAY - 89 }],
        feedId: 'b',
        id: 'recent'
      }
    ])
    // Database is closed only after it was created
    equal((await loadViews()).length, 2)
    trackSeen('c', 5)

    await restartApp()
    let rows = await waitViews(list => {
      return list.length === 2 && list.some(row => row.feedId === 'c')
    })
    deepEqual(
      rows.map(row => row.id),
      ['recent', ownRow('c')]
    )
  })

  test('moves and deletes counters of feeds', async () => {
    await getTables().views.create([
      {
        day: TODAY - 1,
        days: [{ count: 1, day: TODAY - 1 }],
        feedId: 'a',
        id: 'other:a'
      },
      {
        day: TODAY - 1,
        days: [{ count: 2, day: TODAY - 1 }],
        feedId: 'b',
        id: 'other:b'
      },
      {
        day: TODAY - 1,
        days: [{ count: 4, day: TODAY - 1 }],
        feedId: 'c',
        id: 'other:c'
      }
    ])
    trackSeen('a', 8)
    trackSeen('c', 16)

    await moveSeen('a', 'b')
    deepEqual(seenBuffer.get()!.feeds, { c: 16 })
    deepEqual(seenBuffer.get()!.saved, { c: 16 })
    await deleteSeen(['c'])
    deepEqual(seenBuffer.get()!.feeds, {})
    deepEqual(seenBuffer.get()!.saved, {})

    deepEqual(
      Object.fromEntries(
        (await loadViews()).map(row => [row.id, [row.feedId, row.days]])
      ),
      {
        [ownRow('a')]: ['b', [{ count: 8, day: TODAY }]],
        'other:a': ['b', [{ count: 1, day: TODAY - 1 }]],
        'other:b': ['b', [{ count: 2, day: TODAY - 1 }]]
      }
    )
    equal(maxSeen.get(), 11)
  })
})
