import { cleanStores } from 'nanostores'
import { equal } from 'node:assert/strict'
import { afterEach, describe, mock, test } from 'node:test'

import { clock } from '../../index.ts'

describe('date', () => {
  afterEach(() => {
    mock.timers.reset()
    cleanStores(clock)
  })

  test('ticks clock every minute', () => {
    mock.timers.enable({
      apis: ['Date', 'setInterval'],
      now: new Date(2026, 0, 1, 22, 59)
    })
    clock.listen(() => {})
    equal(clock.get().getHours(), 22)
    mock.timers.tick(60_000)
    equal(clock.get().getHours(), 23)
  })
})
