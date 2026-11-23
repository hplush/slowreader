import type { TestServer } from '@logux/server'
import {
  buildTestServer,
  cleanAllTables,
  closeDb
} from '@slowreader/server/test'
import { deepEqual } from 'node:assert/strict'
import { after, afterEach, beforeEach, describe, test } from 'node:test'

import {
  experimentChoices,
  fatal,
  hasCloud,
  setupEnvironment,
  toggleExperiment,
  track
} from '../index.ts'
import { cleanClient, getTestEnvironment, waitUntil } from './utils.ts'

after(closeDb)

describe('events', () => {
  let server: TestServer
  let sent: unknown[]
  beforeEach(() => {
    server = buildTestServer()
    sent = []
    let original = server.fetch.bind(server)
    server.fetch = (url, init) => {
      sent.push({
        body: JSON.parse(init?.body as string),
        credentials: init?.credentials,
        url
      })
      return original(url, init)
    }
    setupEnvironment({
      ...getTestEnvironment(),
      server
    })
    hasCloud.set(true)
  })

  afterEach(async () => {
    hasCloud.set(false)
    experimentChoices.set({})
    await cleanClient()
    await server.destroy()
    await cleanAllTables()
  })

  test('sends fatal errors once a day', async () => {
    fatal.set({ error: undefined, type: 'noDb' })
    fatal.set(undefined)
    fatal.set({ type: 'outdated' })
    fatal.set({ error: undefined, type: 'noDb' })
    fatal.set({ error: 'Error', type: 'crash' })
    await waitUntil(() => sent.length === 2)
    await track('fatal-crash', { daily: true })
    deepEqual(sent, [
      {
        body: { events: ['fatal-noDb'] },
        credentials: 'omit',
        url: '/events'
      },
      {
        body: { events: ['fatal-crash'] },
        credentials: 'omit',
        url: '/events'
      }
    ])
  })

  test('sends events every time by default', async () => {
    await track('fatal-crash')
    await track('fatal-crash')
    deepEqual(
      sent.map(i => (i as { body: unknown }).body),
      [{ events: ['fatal-crash'] }, { events: ['fatal-crash'] }]
    )
  })

  test('remembers sent events after restart', async () => {
    setupEnvironment({
      ...getTestEnvironment(),
      persistentStore: {
        'slowreader:event:fatal-noDb': new Date().toISOString().slice(0, 10)
      },
      server
    })
    await track('fatal-noDb', { daily: true })
    deepEqual(sent, [])
  })

  test('cleans old daily events on start', () => {
    let persistentStore = {
      'slowreader:event:fatal-crash': '2026-01-01',
      'slowreader:event:fatal-noDb': new Date().toISOString().slice(0, 10)
    }
    setupEnvironment({
      ...getTestEnvironment(),
      persistentStore,
      server
    })
    deepEqual(
      Object.keys(persistentStore).filter(i =>
        i.startsWith('slowreader:event:')
      ),
      ['slowreader:event:fatal-noDb']
    )
  })

  test('does not send events of local users', async () => {
    hasCloud.set(false)
    await track('fatal-crash')
    deepEqual(sent, [])
  })

  test('does not send fatal errors after opt-out', async () => {
    toggleExperiment('errors', false)
    fatal.set({ error: 'Error', type: 'crash' })
    toggleExperiment('errors', true)
    fatal.set({ error: undefined, type: 'noDb' })
    await waitUntil(() => sent.length === 1)
    deepEqual(
      sent.map(i => (i as { body: unknown }).body),
      [{ events: ['fatal-noDb'] }]
    )
  })

  test('ignores network errors', async () => {
    server.fetch = () => Promise.reject(new Error('Offline'))
    await track('fatal-noDb')
  })
})
