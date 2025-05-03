import { zeroClean } from '@logux/actions'
import type { Client } from '@logux/client'
import { encryptActions } from '@logux/client'
import { TestClient, TestServer } from '@logux/server'
import { signIn, signUp } from '@slowreader/api'
import { deepStrictEqual } from 'node:assert'
import { afterEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import addedModule from '../modules/added.ts'
import authModule from '../modules/auth.ts'
import passwordModule from '../modules/passwords.ts'
import syncModule from '../modules/sync.ts'
import { cleanAllTables } from './utils.ts'

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
  let user = await signIn({ password, userId }, { fetch: testServer.fetch })
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

test('syncs action between clients', async () => {
  server = new TestServer()
  addedModule(server)
  syncModule(server)
  authModule(server)
  passwordModule(server)

  await signUp({ id: 'user1', password: 'p1' }, { fetch: server.fetch })
  await signUp({ id: 'other', password: 'pOther' }, { fetch: server.fetch })

  let client1 = await connect(server, 'user1', 'p1')
  let other = await connect(server, 'other', 'pOther')

  let z = 'z'.repeat(1000)
  await client1.process({ type: 'A' })
  await client1.process({ type: 'B', z })
  await other.process({ type: 'NO1' })
  await client1.disconnect()

  let client2 = await connect(server, 'user1', 'p1')
  await setTimeout(10)
  deepStrictEqual(client2.log.actions(), [{ type: 'A' }, { type: 'B', z }])

  await client2.process({ type: 'C' })
  await client1.connect()
  await setTimeout(100)
  deepStrictEqual(client1.log.actions(), [
    { type: 'A' },
    { type: 'B', z },
    { type: 'C' }
  ])
  await other.process({ type: 'NO2' })
  await client1.process({ type: 'D' })
  deepStrictEqual(client2.log.actions(), [
    { type: 'A' },
    { type: 'B', z },
    { type: 'C' },
    { type: 'D' }
  ])
  let meta1 = client1.log.entries()[0]![1]
  await client1.log.removeReason('test', { id: meta1.id })
  await setTimeout(10)
  deepStrictEqual(client2.log.actions(), [
    { type: 'A' },
    { type: 'B', z },
    { type: 'C' },
    { type: 'D' },
    { id: meta1.id, type: '0/clean' }
  ])

  let client3 = await connect(server, 'user1', 'p1')
  await setTimeout(10)
  deepStrictEqual(client3.log.actions(), [
    { type: 'B', z },
    { type: 'C' },
    { type: 'D' }
  ])

  let otherMeta = other.log.entries()[0]![1]
  server.expectDenied(async () => {
    await client1.process(zeroClean({ id: otherMeta.id }))
  })
})
