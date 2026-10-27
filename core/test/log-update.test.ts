import { type ClientMeta, TestClient } from '@logux/client'
import {
  createCrdtDatabase,
  type CrdtDatabase,
  defineCrdtTable,
  optional,
  string
} from '@logux/client/db'
import type { Action } from '@logux/core'
import { openDb } from '@nanostores/sql'
import { nodeDriver } from '@nanostores/sql/node'
import { deepEqual, equal } from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, test } from 'node:test'

import { type LogTracker, trackLog } from '../log.ts'

describe('log of the app update', () => {
  let dir: string
  let client: TestClient
  let storage: Record<string, string>

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'slowreader-'))
    client = new TestClient('10')
    storage = {}
  })

  afterEach(() => {
    rmSync(dir, { force: true, recursive: true })
  })

  async function startApp(updated: boolean): Promise<{
    crdt: CrdtDatabase
    stop(): Promise<void>
    tracker: LogTracker
  }> {
    let db = openDb(nodeDriver(join(dir, 'app.sqlite')))
    let crdt = createCrdtDatabase(client, db, { key: 'test', storage })
    if (updated) {
      crdt.table(
        defineCrdtTable('feeds', { extra: optional(string()), title: string() })
      )
      crdt.table(defineCrdtTable('notes', { text: string() }))
    } else {
      crdt.table(defineCrdtTable('feeds', { title: string() }))
    }
    let tracker = trackLog(client, crdt)
    await crdt.ready
    return {
      crdt,
      async stop() {
        tracker.destroy()
        await crdt.destroy()
        await db.close()
      },
      tracker
    }
  }

  async function logEntries(): Promise<[Action, ClientMeta][]> {
    let entries: [Action, ClientMeta][] = []
    await client.log.each({ order: 'added' }, (action, meta) => {
      entries.unshift([action, meta])
    })
    return entries
  }

  test('keeps actions of the newer app until the update', async () => {
    let old = await startApp(false)
    await client.log.add({
      fields: { text: 'Note' },
      id: 'n',
      type: 'notes/created'
    })
    await client.log.add({
      fields: { extra: 'Extra', title: 'A' },
      id: 'f',
      type: 'feeds/created'
    })
    await client.log.add({
      fields: { title: 'B' },
      id: 'g',
      type: 'feeds/created'
    })
    await old.crdt.idle()
    await old.tracker.finish()
    // Only the old table has the row after the shadowing
    await client.log.add({
      fields: { extra: 'X' },
      id: 'g',
      type: 'feeds/changed'
    })
    await client.log.add({
      id: 's',
      online: true,
      type: 'sessions/changed',
      userId: '10'
    })
    await old.crdt.idle()
    await old.tracker.finish()

    let entries = await logEntries()
    deepEqual(
      entries.map(([action, meta]) => [action.type, meta.reasons]),
      [
        ['notes/created', ['notes/n/text', 'notes/n']],
        ['feeds/created', ['feeds/f/extra', 'feeds/f/title', 'feeds/f']],
        ['shadow', ['feeds/g/title', 'feeds/g']],
        ['feeds/changed', ['feeds/g/extra']]
      ]
    )
    await old.stop()

    let updated = await startApp(true)
    await updated.tracker.finish()

    deepEqual(
      (
        await updated.crdt.select<{
          extra: string
        }>`SELECT "extra" FROM "feeds" ORDER BY "id"`
      ).map(row => row.extra),
      ['Extra', 'X']
    )
    deepEqual(
      (
        await updated.crdt.select<{ text: string }>`SELECT "text" FROM "notes"`
      ).map(row => row.text),
      ['Note']
    )
    entries = await logEntries()
    equal(
      entries.every(([action]) => action.type === 'shadow'),
      true
    )
    let reasons = entries.map(([, meta]) => meta.reasons.toSorted())
    deepEqual(reasons, [
      ['feeds/g', 'feeds/g/title'],
      ['notes/n', 'notes/n/text'],
      ['feeds/f', 'feeds/f/extra', 'feeds/f/title'],
      ['feeds/g/extra']
    ])
    await updated.stop()
  })

  test('forgets deleted rows with columns of the newer app', async () => {
    let old = await startApp(false)
    // Real time: tombstones expire by `meta.time`
    let time = Date.now()
    await client.log.add(
      { fields: { text: 'Note' }, id: 'n', type: 'notes/created' },
      { time }
    )
    await client.log.add(
      {
        fields: { extra: 'Extra', title: 'A' },
        id: 'f',
        type: 'feeds/created'
      },
      { time: time + 1 }
    )
    await client.log.add({ id: 'n', type: 'notes/deleted' }, { time: time + 2 })
    await client.log.add({ id: 'f', type: 'feeds/deleted' }, { time: time + 3 })
    await old.crdt.idle()
    await old.tracker.finish()
    // Only tombstones are left, so the update will not bring the rows back
    deepEqual(
      (await logEntries())
        .filter(([action]) => action.type !== '0/clean')
        .map(([action, meta]) => [action.type, meta.reasons]),
      [
        ['notes/deleted', ['tombstone']],
        ['shadow', ['tombstone']]
      ]
    )
    await old.stop()

    let updated = await startApp(true)
    await updated.tracker.finish()
    deepEqual(await updated.crdt.select`SELECT * FROM "notes"`, [])
    deepEqual(await updated.crdt.select`SELECT * FROM "feeds"`, [])
    await updated.stop()
  })
})
