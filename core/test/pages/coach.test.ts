import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import { clock, getTables, nightLock, solveNightTask } from '../../index.ts'
import {
  cleanClient,
  openPage,
  openRoute,
  startClient,
  waitFor
} from '../utils.ts'

describe('coach page', () => {
  let unbindClock = (): void => {}

  beforeEach(() => {
    startClient()
    // Without listeners the clock would return to the real time
    unbindClock = clock.listen(() => {})
  })

  afterEach(async () => {
    unbindClock()
    openRoute({ params: {}, route: 'about' })
    nightLock.set({ enabled: false, from: 23, to: 4 })
    await cleanClient()
  })

  test('changes night lock', () => {
    let page = openPage({ params: {}, route: 'coach' })
    clock.set(new Date(2026, 0, 1, 23, 30))
    equal(page.nightLockEnabled.get(), false)

    page.nightLockEnabled.set(true)
    deepEqual(nightLock.get(), { enabled: true, from: 23, to: 4 })
    equal(page.locked.get().locked, false)

    page.changeNightLockFrom(22)
    page.changeNightLockTo(6)
    deepEqual(nightLock.get(), { enabled: true, from: 22, to: 6 })

    page.nightLockEnabled.set(false)
    deepEqual(nightLock.get(), { enabled: false, from: 22, to: 6 })

    nightLock.set({ enabled: true, from: 21, to: 5 })
    equal(page.nightLockEnabled.get(), true)
    equal(page.nightLockFrom.get(), 21)
    equal(page.nightLockTo.get(), 5)
    // Turning the lock off forgot the solved task
    equal(page.locked.get().locked, true)
  })

  test('asks for a task to change settings at night', () => {
    nightLock.set({ enabled: true, from: 23, to: 7 })
    let page = openPage({ params: {}, route: 'coach' })
    clock.set(new Date(2026, 0, 1, 23, 30))
    equal(page.nightLockFrom.get(), 23)

    let state = page.locked.get()
    if (!state.locked) throw new Error('Not locked')
    solveNightTask(String(state.task.number * state.task.multiplier))
    equal(page.locked.get().locked, false)

    openRoute({ params: {}, route: 'about' })
    page = openPage({ params: {}, route: 'coach' })
    equal(page.locked.get().locked, true)
  })

  test('shows usage of the last 24 hours', async () => {
    let noon = new Date(2026, 0, 1, 12).getTime()
    let hour = 60 * 60 * 1000
    await getTables().usages.create([
      { from: noon - 25 * hour, to: noon - 23 * hour, type: 'slow' },
      { from: noon - 2 * hour, to: noon - 1.5 * hour, type: 'fast' }
    ])
    let page = openPage({ params: {}, route: 'coach' })
    clock.set(new Date(noon))
    await waitFor(page.usageTimeline, value => value.parts.length === 2)
    deepEqual(page.usageSum.get(), { fast: 1800, slow: 3600 })
    deepEqual(page.usageTimeline.get(), {
      marks: [
        { left: 25, time: noon - 18 * hour },
        { left: 50, time: noon - 12 * hour },
        { left: 75, time: noon - 6 * hour }
      ],
      parts: [
        {
          from: noon - 2 * hour,
          left: ((22 * hour) / (24 * hour)) * 100,
          to: noon - 1.5 * hour,
          type: 'fast',
          width: ((0.5 * hour) / (24 * hour)) * 100
        },
        {
          from: noon - 24 * hour,
          left: 0,
          to: noon - 23 * hour,
          type: 'slow',
          width: (hour / (24 * hour)) * 100
        }
      ]
    })
  })
})
