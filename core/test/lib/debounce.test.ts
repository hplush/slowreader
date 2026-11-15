import { deepEqual } from 'node:assert/strict'
import { describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import { debounceTask } from '../../lib/debounce.ts'

describe('debounceTask', () => {
  test('runs once after calls and once more after call in the run', async () => {
    let events: string[] = []
    let finish: (() => void) | undefined
    let debounced = debounceTask(async () => {
      events.push('start')
      await new Promise<void>(resolve => {
        finish = resolve
      })
      events.push('end')
    }, 10)

    debounced.call()
    debounced.call()
    await setTimeout(20)
    deepEqual(events, ['start'])

    debounced.call()
    debounced.call()
    await setTimeout(20)
    deepEqual(events, ['start'])

    finish!()
    await setTimeout(1)
    deepEqual(events, ['start', 'end', 'start'])
    finish!()
    await debounced.wait()
    deepEqual(events, ['start', 'end', 'start', 'end'])
  })

  test('cancels waiting call', async () => {
    let runs = 0
    let debounced = debounceTask(() => {
      runs += 1
      return Promise.resolve()
    }, 10)
    debounced.call()
    debounced.cancel()
    await setTimeout(20)
    await debounced.wait()
    deepEqual(runs, 0)
  })
})
