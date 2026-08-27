import { zero, zeroClean } from '@logux/actions'
import type { Client } from '@logux/client'
import { encryptActions } from '@logux/client'
import { TestClient, type TestServer } from '@logux/server'
import { dbReset, RETENTION, signIn, signUp } from '@slowreader/api'
import { eq } from 'drizzle-orm'
import { deepEqual, equal, notEqual } from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import { db, sessions, users } from '../db/index.ts'
import {
  buildTestServer,
  cleanAllTables,
  getServerLogIds,
  testRequest,
  waitForActions
} from './utils.ts'

describe('server sync', () => {
  let server: TestServer | undefined
  afterEach(async () => {
    await cleanAllTables()
    await server?.destroy()
    server = undefined
  })

  async function connect(
    testServer: TestServer,
    userId: string,
    password: string
  ): Promise<TestClient> {
    let user = await testRequest(testServer, signIn, { password, userId })
    let client = new TestClient(testServer, userId, { token: user.session })
    encryptActions(client as unknown as Client, userId)
    client.log.on('preadd', (action, meta) => {
      if (action.type !== 'logux/processed') {
        meta.reasons.push('test')
        meta.sync = true
      }
    })
    await client.connect()
    return client
  }

  async function getLastActionAt(): Promise<Date | null | undefined> {
    let user = await db.query.users.findFirst({
      columns: { lastActionAt: true },
      where: { id: '0000000000000000' }
    })
    return user?.lastActionAt
  }

  test('syncs action between clients', async () => {
    server = buildTestServer()

    await signUp(
      { password: 'AAAAAAAAAA', userId: '0000000000000000' },
      { fetch: server.fetch }
    )
    await signUp(
      { password: 'BBBBBBBBBB', userId: '0000000000000001' },
      { fetch: server.fetch }
    )

    let client1 = await connect(server, '0000000000000000', 'AAAAAAAAAA')
    let other = await connect(server, '0000000000000001', 'BBBBBBBBBB')

    let z = 'z'.repeat(1000)
    await client1.process({ type: 'A' })
    await client1.process({ type: 'B', z })
    await other.process({ type: 'NO1' })
    await client1.disconnect()

    let client2 = await connect(server, '0000000000000000', 'AAAAAAAAAA')
    await waitForActions(client2, [{ type: 'A' }, { type: 'B', z }])

    await client2.process({ type: 'C' })
    await client1.connect()
    await waitForActions(client1, [
      { type: 'A' },
      { type: 'B', z },
      { type: 'C' }
    ])
    await other.process({ type: 'NO2' })
    await client1.process({ type: 'D' })
    await waitForActions(client2, [
      { type: 'A' },
      { type: 'B', z },
      { type: 'C' },
      { type: 'D' }
    ])
    let meta1 = client1.log.entries()[0]![1]
    await client1.log.removeReason('test', { id: meta1.id })
    await waitForActions(client2, [
      { type: 'A' },
      { type: 'B', z },
      { type: 'C' },
      { type: 'D' },
      { id: meta1.id, type: '0/clean' }
    ])

    // Cleaning the action, which was already removed, is not an error
    await client1.process(zeroClean({ id: `0 ${client1.clientId}` }))

    let client3 = await connect(server, '0000000000000000', 'AAAAAAAAAA')
    await waitForActions(client3, [
      { type: 'B', z },
      { type: 'C' },
      { type: 'D' }
    ])

    let otherMeta = other.log.entries()[0]![1]
    server.expectDenied(async () => {
      await client1.process(zeroClean({ id: otherMeta.id }))
    })
  })

  test('asks the stale client to re-download everything', async () => {
    server = buildTestServer()
    await signUp(
      { password: 'AAAAAAAAAA', userId: '0000000000000000' },
      { fetch: server.fetch }
    )
    let writer = await connect(server, '0000000000000000', 'AAAAAAAAAA')
    await writer.process({ type: 'A' })

    let reader = await connect(server, '0000000000000000', 'AAAAAAAAAA')
    await waitForActions(reader, [{ type: 'A' }])
    await reader.disconnect()
    await setTimeout(100)

    // The device was offline longer than the tombstone retention window
    let long = new Date(Date.now() - 2 * RETENTION)
    await db
      .update(sessions)
      .set({ usedAt: long })
      .where(eq(sessions.clientId, reader.clientId))

    await reader.connect()
    await waitForActions(reader, [{ type: 'A' }, dbReset({})])
  })

  test('sends the diff to the client without new actions', async () => {
    server = buildTestServer()
    await signUp(
      { password: 'AAAAAAAAAA', userId: '0000000000000000' },
      { fetch: server.fetch }
    )
    let writer = await connect(server, '0000000000000000', 'AAAAAAAAAA')
    await writer.process({ type: 'A' })

    let reader = await connect(server, '0000000000000000', 'AAAAAAAAAA')
    await waitForActions(reader, [{ type: 'A' }])
    await reader.disconnect()
    await setTimeout(100)

    // Nothing was written while the device was away
    await db
      .update(sessions)
      .set({ usedAt: new Date(Date.now() - 2 * RETENTION) })
      .where(eq(sessions.clientId, reader.clientId))
    await db
      .update(users)
      .set({ lastActionAt: new Date(Date.now() - 3 * RETENTION) })
      .where(eq(users.id, '0000000000000000'))

    await reader.connect()
    await setTimeout(300)
    deepEqual(
      reader.log.actions().filter(i => i.type === dbReset.type),
      []
    )
  })

  test('writes the last action time on server destroy', async () => {
    server = buildTestServer()
    await signUp(
      { password: 'AAAAAAAAAA', userId: '0000000000000000' },
      { fetch: server.fetch }
    )
    let client = await connect(server, '0000000000000000', 'AAAAAAAAAA')
    await client.process({ type: 'A' })

    await server.destroy()
    server = undefined
    await setTimeout(100)
    notEqual(await getLastActionAt(), null)
  })

  test('ignores action saved before the reconnect', async () => {
    server = buildTestServer()
    await signUp(
      { password: 'AAAAAAAAAA', userId: '0000000000000000' },
      { fetch: server.fetch }
    )
    let client = await connect(server, '0000000000000000', 'AAAAAAAAAA')
    await client.process({ type: 'A' })
    let meta = client.log.entries()[0]![1]

    // Client re-sends actions which were not confirmed before the reconnect
    await server.log.add(
      zero({
        compressed: false,
        d: new Uint8Array([1]),
        iv: new Uint8Array([2])
      }),
      { id: meta.id, reasons: [] }
    )
    await setTimeout(100)

    deepEqual(
      client.log.actions().filter(i => i.type === 'logux/undo'),
      []
    )
    equal((await getServerLogIds()).length, 1)
  })
})
