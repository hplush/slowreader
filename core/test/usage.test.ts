import { deepEqual, equal, notEqual } from 'node:assert/strict'
import { afterEach, beforeEach, describe, mock, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  client,
  clock,
  getTables,
  lastUsage,
  needUsefulReminder,
  nightLock,
  trackUsage,
  userId,
  type UsageValue,
  usage24hours,
  usageBalance,
  usageMood,
  usageSessions,
  usageSince
} from '../index.ts'
import {
  cleanClient,
  exitTestApp,
  openRoute,
  persistentDatabase,
  setTestVisibility,
  startClient,
  waitFor,
  waitUntil
} from './utils.ts'

const START = new Date(2026, 0, 1, 12).getTime()
const MINUTE = 60_000

function at(ms: number): void {
  mock.timers.setTime(START + ms)
}

function loadUsages(): Promise<UsageValue[]> {
  return getTables().usages.load`ORDER BY "from"`
}

async function waitUsages(
  check: (rows: UsageValue[]) => boolean
): Promise<UsageValue[]> {
  // Mocked `Date` would never end the timeout of `waitUntil()`
  for (let i = 0; i < 300; i++) {
    let rows = await loadUsages()
    if (check(rows)) return rows
    await setTimeout(10)
  }
  throw new Error('Usages did not get the expected value')
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

describe('usage', () => {
  beforeEach(() => {
    mock.timers.enable({ apis: ['Date'], now: START })
    startClient({ databaseCreator: persistentDatabase() })
  })

  afterEach(async () => {
    openRoute({ params: {}, route: 'home' })
    lastUsage.set(undefined)
    nightLock.set({ enabled: false, from: 23, to: 7 })
    trackUsage.set(true)
    clock.set(new Date())
    mock.timers.reset()
    await cleanClient()
  })

  test('counts time while the reading is visible', async () => {
    openRoute({ params: {}, route: 'fast' })
    at(2 * MINUTE)
    openRoute({ hash: 'post=1', params: {}, route: 'fast' })
    at(5 * MINUTE)
    setTestVisibility(false)
    at(20 * MINUTE)
    openRoute({ params: {}, route: 'home' })

    let rows = await waitUsages(list => list[0]?.to === START + 5 * MINUTE)
    deepEqual(rows, [
      {
        from: START,
        id: lastUsage.get()!.id,
        to: START + 5 * MINUTE,
        type: 'fast'
      }
    ])
  })

  test('writes the database at most once a minute', async () => {
    openRoute({ params: {}, route: 'slow' })
    at(30_000)
    openRoute({ hash: 'post=a', params: {}, route: 'slow' })
    equal(lastUsage.get()!.to, START + 30_000)
    equal(lastUsage.get()!.created, false)

    at(70_000)
    openRoute({ hash: 'post=b', params: {}, route: 'slow' })
    let rows = await waitUsages(list => list.length === 1)
    equal(rows[0]!.to, START + 70_000)

    at(90_000)
    openRoute({ hash: 'post=c', params: {}, route: 'slow' })
    equal(lastUsage.get()!.to, START + 90_000)
    equal((await loadUsages())[0]!.to, START + 70_000)
  })

  test('keeps the session after a short break', async () => {
    openRoute({ params: {}, route: 'slow' })
    at(MINUTE)
    setTestVisibility(false)
    let first = lastUsage.get()!.id

    at(MINUTE + 30_000)
    setTestVisibility(true)
    equal(lastUsage.get()!.id, first)
    at(2 * MINUTE)
    setTestVisibility(false)

    at(4 * MINUTE)
    setTestVisibility(true)
    notEqual(lastUsage.get()!.id, first)
    at(5 * MINUTE)
    openRoute({ params: {}, route: 'fast' })
    at(6 * MINUTE)
    exitTestApp()

    let rows = await waitUsages(list => list.length === 3)
    deepEqual(
      rows.map(row => [row.type, row.from - START, row.to - START]),
      [
        ['slow', 0, 2 * MINUTE],
        ['slow', 4 * MINUTE, 5 * MINUTE],
        ['fast', 5 * MINUTE, 6 * MINUTE]
      ]
    )
  })

  test('ignores sessions shorter than 10 seconds', async t => {
    openRoute({ params: {}, route: 'fast' })
    at(9_000)
    openRoute({ params: {}, route: 'slow' })
    equal(lastUsage.get()!.type, 'slow')
    at(9_000 + MINUTE)
    openRoute({ params: {}, route: 'home' })

    let rows = await waitUsages(list => list.length === 1)
    deepEqual(
      rows.map(row => [row.type, row.from - START, row.to - START]),
      [['slow', 9_000, 9_000 + MINUTE]]
    )

    t.after(usageSessions.listen(() => {}))
    await waitFor(usageSessions, list => list?.length === 1)
    lastUsage.set({
      created: false,
      from: START + 2 * MINUTE,
      id: 'short',
      saved: START + 2 * MINUTE,
      to: START + 2 * MINUTE + 9_000,
      type: 'fast'
    })
    equal(usageSessions.get()!.length, 1)
  })

  test('does not count the hidden app', () => {
    setTestVisibility(false)
    openRoute({ params: {}, route: 'slow' })
    at(MINUTE)
    openRoute({ params: {}, route: 'home' })
    equal(lastUsage.get(), undefined)
  })

  test('stops when tracking is disabled', () => {
    openRoute({ params: {}, route: 'slow' })
    at(MINUTE)
    trackUsage.set(false)
    equal(lastUsage.get()!.to, START + MINUTE)
    at(5 * MINUTE)
    openRoute({ hash: 'post=a', params: {}, route: 'slow' })
    equal(lastUsage.get()!.to, START + MINUTE)
  })

  test('moves only the session of the visible tab', () => {
    openRoute({ params: {}, route: 'slow' })
    lastUsage.set({
      created: false,
      from: START,
      id: 'other',
      saved: START,
      to: START,
      type: 'fast'
    })
    at(MINUTE)
    openRoute({ hash: 'post=a', params: {}, route: 'slow' })
    equal(lastUsage.get()!.to, START)
  })

  test('saves the session of the closed app on the next start', async () => {
    lastUsage.set({
      created: false,
      from: START - MINUTE,
      id: 'closed',
      saved: START - MINUTE,
      to: START - 30_000,
      type: 'slow'
    })
    await restartApp()
    let rows = await waitUsages(list => list.length === 1)
    deepEqual(rows, [
      { from: START - MINUTE, id: 'closed', to: START - 30_000, type: 'slow' }
    ])
  })

  test('does not count Fun under the night lock', () => {
    // Without listeners the clock would return to the real time
    let unbindClock = clock.listen(() => {})
    clock.set(new Date(2026, 0, 1, 23, 30))
    nightLock.set({ enabled: true, from: 23, to: 7 })
    openRoute({ params: {}, route: 'fast' })
    at(MINUTE)
    openRoute({ params: {}, route: 'home' })
    unbindClock()
    equal(lastUsage.get(), undefined)
  })

  test('combines devices and deletes old sessions', async () => {
    await getTables().usages.create([
      {
        from: START - 30 * 60 * MINUTE,
        id: 'old',
        to: START - 25 * 60 * MINUTE,
        type: 'fast'
      },
      {
        from: START - 10 * MINUTE,
        id: 'phone',
        to: START - 5 * MINUTE,
        type: 'fast'
      },
      { from: START - 3 * MINUTE, id: 'laptop', to: START, type: 'slow' }
    ])
    clock.set(new Date(START + MINUTE))
    let unbind = usage24hours.listen(() => {})
    await waitFor(usage24hours, list => list?.length === 2)
    let sessions = usage24hours.get()!
    equal(usageSince(sessions, 'fast', START - 7 * MINUTE), 2 * MINUTE)
    equal(usageSince(sessions, 'slow', START - 24 * 60 * MINUTE), 3 * MINUTE)

    lastUsage.set({
      created: true,
      from: START - 3 * MINUTE,
      id: 'laptop',
      saved: START,
      to: START + 30_000,
      type: 'slow'
    })
    sessions = usage24hours.get()!
    equal(sessions.length, 2)
    equal(usageSince(sessions, 'slow', START - MINUTE), 90_000)
    unbind()

    await restartApp()
    await waitUsages(list => list.length === 2)
    deepEqual(
      (await loadUsages()).map(row => row.id),
      ['phone', 'laptop']
    )
  })

  test('balances Useful and Fun', async t => {
    await getTables().usages.create({
      from: START - 10 * MINUTE,
      id: 'useful',
      to: START - 8 * MINUTE,
      type: 'slow'
    })
    clock.set(new Date(START))
    t.after(usageMood.listen(() => {}))
    await waitFor(usage24hours, list => list?.length === 1)
    function read(type: 'fast' | 'slow', minutes: number): void {
      lastUsage.set({
        created: true,
        from: START - minutes * MINUTE,
        id: 'last',
        saved: START,
        to: START,
        type
      })
    }

    read('fast', 2)
    equal(usageBalance.get(), 0)
    equal(usageMood.get(), 'good')

    read('fast', 3)
    equal(usageBalance.get(), 1 / 5)
    equal(usageMood.get(), 'good')

    read('fast', 4)
    equal(usageBalance.get(), 2 / 6)
    equal(usageMood.get(), 'neutral')

    read('fast', 10)
    equal(usageBalance.get(), 8 / 12)
    equal(usageMood.get(), 'bad')

    read('slow', 10)
    equal(usageBalance.get(), -1)
    equal(usageMood.get(), 'good')
  })

  test('reminds about Useful when Fun took more time', async t => {
    await getTables().usages.create({
      from: START - 20 * MINUTE,
      id: 'useful',
      to: START - 14 * MINUTE,
      type: 'slow'
    })
    clock.set(new Date(START))
    t.after(needUsefulReminder.listen(() => {}))
    await waitFor(usage24hours, list => list?.length === 1)
    function read(type: 'fast' | 'slow', minutes: number): void {
      lastUsage.set({
        created: true,
        from: START - minutes * MINUTE,
        id: 'last',
        saved: START,
        to: START,
        type
      })
    }

    read('fast', 2)
    equal(needUsefulReminder.get(), false)

    read('fast', 3)
    equal(needUsefulReminder.get(), true)

    trackUsage.set(false)
    read('slow', 4)
    equal(needUsefulReminder.get(), true)
  })

  test('does not remind about Useful after reading it', async t => {
    await getTables().usages.create({
      from: START - 60 * MINUTE,
      id: 'fun',
      to: START - 30 * MINUTE,
      type: 'fast'
    })
    clock.set(new Date(START))
    t.after(needUsefulReminder.listen(() => {}))
    await waitFor(usage24hours, list => list?.length === 1)
    equal(needUsefulReminder.get(), true)

    lastUsage.set({
      created: true,
      from: START - 9 * MINUTE,
      id: 'last',
      saved: START,
      to: START - 3 * MINUTE,
      type: 'slow'
    })
    equal(needUsefulReminder.get(), false)

    clock.set(new Date(START + 5 * MINUTE))
    equal(needUsefulReminder.get(), true)
  })
})
