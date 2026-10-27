import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  fastPostsLifetime,
  getTables,
  nightLock,
  openWarnings,
  type SettingsValue,
  showSensitiveMedia,
  syncedSettingsLoading,
  waitLoading
} from '../index.ts'
import { cleanClient, delayedDatabase, startClient, waitFor } from './utils.ts'

async function waitRow(
  check: (row: SettingsValue | undefined) => boolean
): Promise<SettingsValue | undefined> {
  let row = getTables().settings.row('user')
  await waitFor(row, value => value.status === 'ready' && check(value.value))
  let value = row.get()
  return value.status === 'ready' ? value.value : undefined
}

describe('synced settings', () => {
  beforeEach(() => {
    // Like the browser, rows of the older writes come after the newer ones
    startClient({ databaseCreator: delayedDatabase() })
  })

  afterEach(async () => {
    await cleanClient()
    fastPostsLifetime.set('month')
    nightLock.set({ enabled: false, from: 23, to: 7 })
    openWarnings.set(false)
    showSensitiveMedia.set(false)
  })

  test('replaces cache by the database', async () => {
    openWarnings.set(true)
    equal(syncedSettingsLoading.get(), true)
    await waitLoading(syncedSettingsLoading)
    equal(openWarnings.get(), false)
  })

  test('creates the row only with the creation time', async () => {
    await waitLoading(syncedSettingsLoading)
    equal(await getTables().settings.get('user'), undefined)

    openWarnings.set(true)
    let row = await waitRow(value => value?.openWarnings === true)
    equal(typeof row?.createdAt, 'number')
    // Another device created the row before it got this one
    await getTables().settings.create({ createdAt: 1, id: 'user' })
    row = await waitRow(value => value?.createdAt === 1)
    equal(row?.openWarnings, true)
    equal(openWarnings.get(), true)
  })

  test('applies changes from another device', async () => {
    await waitLoading(syncedSettingsLoading)
    await getTables().settings.create({
      id: 'user',
      nightLock: { enabled: true, from: 22, to: 6 },
      openWarnings: true
    })
    await waitFor(openWarnings, value => value)
    deepEqual(nightLock.get(), { enabled: true, from: 22, to: 6 })
    equal(fastPostsLifetime.get(), 'month')

    await getTables().settings.update('user', {
      nightLock: { enabled: false, from: 22, to: 6 }
    })
    await waitFor(nightLock, value => !value.enabled)
    equal(openWarnings.get(), true)
  })

  test('saves only changed settings', async () => {
    await waitLoading(syncedSettingsLoading)
    showSensitiveMedia.set(true)
    let row = await waitRow(value => value?.showSensitiveMedia === true)
    equal(row?.openWarnings, null)
    equal(row?.fastPostsLifetime, null)

    nightLock.set({ enabled: true, from: 23, to: 7 })
    row = await waitRow(value => !!value?.nightLock)
    deepEqual(row?.nightLock, { enabled: true, from: 23, to: 7 })
    equal(row?.showSensitiveMedia, true)

    nightLock.set({ enabled: false, from: 23, to: 7 })
    row = await waitRow(value => value?.nightLock?.enabled === false)
    equal(row?.showSensitiveMedia, true)
  })

  test('keeps the last value of quick changes', async () => {
    await waitLoading(syncedSettingsLoading)
    openWarnings.set(true)
    await waitRow(value => value?.openWarnings === true)

    nightLock.set({ enabled: true, from: 22, to: 6 })
    openWarnings.set(false)
    // The row of the night lock write still has the old value of warnings
    await waitRow(value => !!value?.nightLock)
    openWarnings.set(true)
    await setTimeout(100)
    equal(openWarnings.get(), true)
    equal((await waitRow(() => true))?.openWarnings, true)
  })
})
