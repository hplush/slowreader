import { deepStrictEqual, equal } from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import { busy, busyDuring } from '../index.ts'
import { cleanClientTest } from './utils.ts'

describe('busy', () => {
  afterEach(async () => {
    await cleanClientTest()
  })

  test('allows to manually set busy state', async () => {
    equal(busy.get(), false)
    await busyDuring(async () => {
      deepStrictEqual(busy.get(), { label: undefined, progress: undefined })
      await busyDuring(async () => {
        await setTimeout(10)
      })
      deepStrictEqual(busy.get(), { label: undefined, progress: undefined })
    })
    equal(busy.get(), false)
  })

  test('shows label and progress of the latest task', async () => {
    let result = await busyDuring(async setProgress => {
      deepStrictEqual(busy.get(), { label: 'Loading', progress: undefined })
      setProgress(0.5)
      deepStrictEqual(busy.get(), { label: 'Loading', progress: 0.5 })

      await busyDuring(async setNested => {
        deepStrictEqual(busy.get(), { label: 'Loading', progress: 0.5 })
        setNested(0.1)
        deepStrictEqual(busy.get(), { label: undefined, progress: 0.1 })
        await busyDuring(async () => {
          deepStrictEqual(busy.get(), { label: 'Saving', progress: undefined })
          await setTimeout(10)
        }, 'Saving')
      })

      deepStrictEqual(busy.get(), { label: 'Loading', progress: 0.5 })
      return 'done'
    }, 'Loading')
    equal(result, 'done')
    equal(busy.get(), false)
  })
})
