import { atom } from 'nanostores'
import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import {
  addAccount,
  addFeed,
  deleteAccount,
  downloadingCloudData,
  extensionState,
  isDemo,
  keepDemo,
  markWelcomeStep,
  needWelcome,
  testAccount,
  testFeed,
  unmarkWelcomeStep,
  welcomeSteps,
  welcomeTodo
} from '../index.ts'
import { cleanClient, openRoute, startClient, waitFor } from './utils.ts'

describe('welcome', () => {
  afterEach(async () => {
    await cleanClient()
  })

  test('waits for the database to know about the welcome', async () => {
    let values: (boolean | undefined)[] = []
    let unbind = needWelcome.subscribe(value => {
      values.push(value)
    })

    startClient()
    await waitFor(needWelcome, welcome => typeof welcome !== 'undefined')
    unbind()

    deepEqual(values, [undefined, true])
  })

  test('tracks steps of the demo mode', async () => {
    isDemo.set(true)
    startClient()
    await waitFor(needWelcome, welcome => welcome === true)
    await addFeed(testFeed())
    deepEqual(welcomeSteps.get(), { demo: true, done: [] })
    deepEqual(welcomeTodo.get(), {
      demo: true,
      done: new Set(),
      locked: new Set()
    })

    openRoute({ params: {}, route: 'slow' })
    openRoute({ params: {}, route: 'fast' })
    extensionState.set('granted')
    markWelcomeStep('fast')
    deepEqual(welcomeSteps.get(), {
      demo: true,
      done: ['slow', 'fast', 'extension']
    })

    openRoute({ params: {}, route: 'welcome' })
    keepDemo()
    equal(needWelcome.get(), false)
    deepEqual(welcomeTodo.get(), {
      demo: true,
      done: new Set(['clean', 'extension', 'fast', 'import', 'slow']),
      locked: new Set(['clean', 'import'])
    })

    openRoute({ params: {}, route: 'slow' })
    equal(welcomeSteps.get(), undefined)

    markWelcomeStep('read')
    equal(welcomeSteps.get(), undefined)
    unmarkWelcomeStep('read')
    equal(welcomeSteps.get(), undefined)
  })

  test('finishes with own feeds', async () => {
    startClient()
    await waitFor(needWelcome, welcome => welcome === true)
    deepEqual(welcomeSteps.get(), { demo: false, done: [] })
    deepEqual(welcomeTodo.get(), {
      demo: false,
      done: new Set(['clean']),
      locked: new Set(['clean'])
    })

    openRoute({ params: {}, route: 'slow' })
    markWelcomeStep('read')
    deepEqual(welcomeSteps.get(), { demo: false, done: ['slow', 'read'] })
    unmarkWelcomeStep('read')
    deepEqual(welcomeSteps.get(), { demo: false, done: ['slow'] })

    await addFeed(testFeed())
    await waitFor(needWelcome, welcome => welcome === false)
    equal(welcomeSteps.get(), undefined)
    deepEqual(welcomeTodo.get(), {
      demo: false,
      done: new Set(['clean', 'import']),
      locked: new Set(['clean', 'import'])
    })
  })

  test('finishes with account', async () => {
    startClient()
    await waitFor(needWelcome, welcome => welcome === true)

    let accountId = await addAccount(testAccount())
    await waitFor(needWelcome, welcome => welcome === false)
    deepEqual(welcomeTodo.get(), {
      demo: false,
      done: new Set(['clean', 'import']),
      locked: new Set(['clean', 'import'])
    })

    await deleteAccount(accountId)
    await waitFor(needWelcome, welcome => welcome === true)
  })

  test('waits for the cloud download to start the welcome', async () => {
    startClient()
    await waitFor(needWelcome, welcome => welcome === true)

    downloadingCloudData.set(true)
    welcomeSteps.set(undefined)
    equal(welcomeSteps.get(), undefined)

    downloadingCloudData.set(false)
    deepEqual(welcomeSteps.get(), { demo: false, done: [] })
  })

  test('keeps welcome when environment forces it', async () => {
    let forced = atom(true)
    startClient({ forceWelcome: forced })
    await waitFor(needWelcome, welcome => welcome === true)

    await addFeed(testFeed())
    equal(needWelcome.get(), true)
    deepEqual(welcomeSteps.get(), { demo: false, done: [] })

    forced.set(false)
    equal(needWelcome.get(), false)
  })
})
