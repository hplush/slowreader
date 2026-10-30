import { deepEqual, equal, ok } from 'node:assert/strict'
import { afterEach, describe, mock, test } from 'node:test'

import {
  checkAnswer,
  clock,
  generateTask,
  inTimeRange,
  nightLock,
  nightLocked,
  nightLockState,
  type NightLockState,
  router,
  setNightTaskRandom,
  solveNightTask,
  unlockCurrentPage
} from '../index.ts'

function at(hours: number, minutes = 0): Date {
  return new Date(2026, 0, 1, hours, minutes)
}

function ensureLocked(
  state: NightLockState
): Extract<NightLockState, { locked: true }> {
  if (!state.locked) throw new Error('Not locked')
  return state
}

describe('night lock', () => {
  afterEach(() => {
    nightLock.set({ enabled: false, from: 23, to: 7 })
    router.set({ params: {}, popups: [], route: 'home' })
  })

  test('checks time range across midnight', () => {
    equal(inTimeRange(at(23), 23, 7), true)
    equal(inTimeRange(at(2, 30), 23, 7), true)
    equal(inTimeRange(at(6, 59), 23, 7), true)
    equal(inTimeRange(at(7), 23, 7), false)
    equal(inTimeRange(at(22, 59), 23, 7), false)
    equal(inTimeRange(at(1), 0, 5), true)
    equal(inTimeRange(at(5), 0, 5), false)
  })

  test('generates tasks', () => {
    for (let i = 0; i < 1000; i++) {
      let task = generateTask()
      ok(task.number >= 13 && task.number <= 99)
      ok(task.number % 10 !== 0)
      ok(task.number % 11 !== 0)
      ok(task.multiplier === 2 || task.multiplier === 3)
    }
  })

  test('allows to fix task random', () => {
    let unbind = nightLockState.listen(() => {})
    clock.set(at(23, 30))
    nightLock.set({ enabled: true, from: 23, to: 7 })
    setNightTaskRandom(() => 0.5)
    deepEqual(ensureLocked(nightLockState.get()).task, {
      multiplier: 3,
      number: 37
    })
    setNightTaskRandom(Math.random)
    unbind()
  })

  test('checks answer', () => {
    let task = { multiplier: 3, number: 47 }
    equal(checkAnswer(task, '141'), true)
    equal(checkAnswer(task, ' 141 '), true)
    equal(checkAnswer(task, '140'), false)
    equal(checkAnswer(task, ''), false)
    equal(checkAnswer(task, '141.0'), false)
  })

  test('ticks clock every minute', () => {
    mock.timers.enable({ apis: ['Date', 'setInterval'], now: at(22, 59) })
    let unbind = clock.listen(() => {})
    equal(clock.get().getHours(), 22)
    mock.timers.tick(60_000)
    equal(clock.get().getHours(), 23)
    unbind()
    mock.timers.reset()
  })

  test('locks only during the period', () => {
    let unbind = nightLocked.listen(() => {})
    clock.set(at(23, 30))
    equal(nightLocked.get(), false)
    nightLock.set({ enabled: true, from: 23, to: 7 })
    equal(nightLocked.get(), true)
    clock.set(at(12))
    equal(nightLocked.get(), false)
    unbind()
  })

  test('unlocks only until the route change', () => {
    let unbind = nightLockState.listen(() => {})
    clock.set(at(23, 30))
    nightLock.set({ enabled: true, from: 23, to: 7 })

    let state = ensureLocked(nightLockState.get())
    equal(state.until, 7)
    equal(state.wrong, false)

    solveNightTask(String(state.task.number * state.task.multiplier + 1))
    state = ensureLocked(nightLockState.get())
    equal(state.wrong, true)

    solveNightTask(String(state.task.number * state.task.multiplier))
    equal(nightLockState.get().locked, false)

    router.set({
      params: {},
      popups: [{ param: 'id', popup: 'post' }],
      route: 'home'
    })
    equal(nightLockState.get().locked, false)

    router.set({ params: {}, popups: [], route: 'fast' })
    equal(ensureLocked(nightLockState.get()).wrong, false)

    unlockCurrentPage()
    equal(nightLockState.get().locked, false)
    router.set({ params: {}, popups: [], route: 'home' })
    equal(nightLockState.get().locked, true)
    unbind()
  })
})
