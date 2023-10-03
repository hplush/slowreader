import { equal } from 'node:assert'
import { test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import { createQueue, retryOnError } from '../../utils/queue.js'

test('increase keys', async () => {
  let events = ''
  let queue = createQueue<{ inc: number; multiply: number }>([
    { payload: 1, type: 'inc' },
    { payload: 10, type: 'inc' },
    { payload: 100, type: 'inc' },
    { payload: 1000, type: 'multiply' },
    { payload: 10000, type: 'multiply' }
  ])

  let resolves: (() => void)[] = []
  let finished = false
  queue
    .start(2, {
      async inc(payload) {
        await new Promise<void>(resolve => {
          resolves.push(resolve)
        })
        events += payload + 1 + ' '
      },
      async multiply(payload) {
        await new Promise<void>(resolve => {
          resolves.push(resolve)
        })
        events += payload * 2 + ' '
      }
    })
    .then(() => {
      finished = true
    })
  equal(events, '')
  equal(resolves.length, 2)

  resolves[0]!()
  await setTimeout(10)
  equal(events, '2 ')
  equal(resolves.length, 3)

  resolves[1]!()
  resolves[2]!()
  await setTimeout(10)
  equal(events, '2 11 101 ')
  equal(resolves.length, 5)
  equal(finished, false)

  resolves[3]!()
  resolves[4]!()
  await setTimeout(10)
  equal(events, '2 11 101 2000 20000 ')
  equal(resolves.length, 5)
  equal(finished, true)
})

test('allows to add test in the middle', async () => {
  let events = ''
  let queue = createQueue<{ a: number; b: number }>([{ payload: 1, type: 'a' }])

  await queue.start(2, {
    async a(payload, tasks) {
      tasks.push({ payload: 2, type: 'b' })
      events += `a${payload} `
    },
    async b(payload) {
      events += `b${payload} `
    }
  })

  equal(events, 'a1 b2 ')
})

test('stops queue', async () => {
  let events = ''
  let queue = createQueue<{ a: number }>([
    { payload: 1, type: 'a' },
    { payload: 2, type: 'a' },
    { payload: 3, type: 'a' },
    { payload: 4, type: 'a' }
  ])

  let resolves: (() => void)[] = []
  let finished = false
  queue
    .start(2, {
      async a(payload) {
        await new Promise<void>(resolve => {
          resolves.push(resolve)
        })
        events += `a${payload} `
      }
    })
    .then(() => {
      finished = true
    })

  queue.stop()
  resolves[0]!()
  resolves[1]!()
  await setTimeout(10)
  equal(events, 'a1 a2 ')
  equal(resolves.length, 2)
  equal(finished, true)
})

test('reties on error', async () => {
  let errorReport = 0
  let attempts = 0
  let result = await retryOnError(
    () => {
      attempts += 1
      throw new Error('test')
    },
    () => {
      errorReport += 1
    }
  )

  equal(result, undefined)
  equal(attempts, 3)
  equal(errorReport, 1)
})

test('fails on AbortError', async () => {
  let errorReport = 0
  let attempts = 0
  let result = await retryOnError(
    () => {
      attempts += 1
      let error = new Error()
      error.name = 'AbortError'
      throw error
    },
    () => {
      errorReport += 1
    }
  )

  equal(result, undefined)
  equal(attempts, 1)
  equal(errorReport, 0)
})

test('returns value after error', async () => {
  let errorReport = 0
  let attempts = 0
  let result = await retryOnError(
    async () => {
      attempts += 1
      if (attempts === 2) {
        return 'ok'
      } else {
        throw new Error('test')
      }
    },
    () => {
      errorReport += 1
    }
  )

  equal(result, 'ok')
  equal(attempts, 2)
  equal(errorReport, 1)
})

test('returns value on no error', async () => {
  let errorReport = 0
  let attempts = 0
  let result = await retryOnError(
    async () => {
      attempts += 1
      return 'ok'
    },
    () => {
      errorReport += 1
    }
  )

  equal(result, 'ok')
  equal(attempts, 1)
  equal(errorReport, 0)
})
