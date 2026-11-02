import { sendEvents } from '@slowreader/api'
import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import { db, events } from '../db/index.ts'
import eventsModule from '../modules/events.ts'
import { buildTestServer, cleanAllTables, emptyTestServer } from './utils.ts'

async function counts(): Promise<Record<string, number>> {
  let rows = await db.select().from(events)
  return Object.fromEntries(rows.map(i => [i.name, i.count]))
}

function post(
  server: ReturnType<typeof emptyTestServer>,
  body: unknown
): Promise<Response> {
  return server.fetch('/events', {
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST'
  })
}

describe('server events', () => {
  afterEach(async () => {
    await cleanAllTables()
  })

  test('is disabled without token', async () => {
    await using server = emptyTestServer()
    eventsModule(server, undefined)
    equal((await post(server, { events: ['fatal-crash'] })).status, 404)
  })

  test('counts events', async () => {
    await using server = buildTestServer()
    let response = await sendEvents(
      { events: ['fatal-crash', 'fatal-noDb'] },
      { fetch: server.fetch }
    )
    equal(response.status, 200)
    deepEqual(await response.json(), {})
    await post(server, { events: ['fatal-crash', 'fatal-crash'] })
    deepEqual(await counts(), { 'fatal-crash': 2, 'fatal-noDb': 1 })
  })

  test('accepts only known events', async () => {
    await using server = buildTestServer()
    equal((await post(server, { events: ['unknown'] })).status, 400)
    equal((await post(server, { events: [] })).status, 400)
    equal((await post(server, { events: 'fatal-crash' })).status, 400)
    equal((await post(server, {})).status, 400)
    equal(
      (await post(server, { events: ['fatal-crash'], userId: '1' })).status,
      400
    )
    deepEqual(await counts(), {})
  })

  test('limits requests by IP', async () => {
    await using server = buildTestServer()
    for (let i = 0; i < 20; i++) {
      equal((await post(server, { events: ['fatal-crash'] })).status, 200)
    }
    equal((await post(server, { events: ['fatal-crash'] })).status, 429)
    deepEqual(await counts(), { 'fatal-crash': 20 })
  })
})
