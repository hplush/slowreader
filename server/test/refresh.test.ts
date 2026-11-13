import { zeroClean } from '@logux/actions'
import { TestClient, type TestServer } from '@logux/server'
import {
  refreshLock,
  refreshLocked,
  refreshUnlock,
  refreshUnlocked
} from '@slowreader/api'
import { deepEqual, equal, ok } from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import { buildTestServer, cleanAllTables, signUpUser } from './utils.ts'

describe('server refresh lock', () => {
  afterEach(async () => {
    await cleanAllTables()
  })

  async function connect(
    server: TestServer,
    session: string
  ): Promise<TestClient> {
    return server.connect('0000000000000000', { token: session })
  }

  async function collect(
    client: TestClient,
    cb: () => Promise<void>
  ): Promise<object[]> {
    let actions = await client.collect(async () => {
      await cb()
      await setTimeout(10)
    })
    return actions.filter(i => i.type.startsWith('refresh/'))
  }

  function waitReceived(client: TestClient, type: string): Promise<void> {
    return new Promise(resolve => {
      let unbind = client.node.log.type(type, () => {
        unbind()
        resolve()
      })
    })
  }

  test('gives lock to one tab', async () => {
    await using server = buildTestServer()
    let { session } = await signUpUser(server, '0000000000000000')
    let first = await connect(server, session)
    let second = await connect(server, session)

    await server.expectDenied(async () => {
      await first.process(refreshLocked({ nodeId: first.nodeId }))
    })
    await server.expectDenied(async () => {
      await first.process(refreshUnlocked({}))
    })
    await server.expectDenied(async () => {
      await first.process({ other: 1, type: 'refresh/lock' })
    })
    await server.expectDenied(async () => {
      await first.process({ other: 1, type: 'refresh/unlock' })
    })

    deepEqual(
      await collect(second, async () => {
        await first.process(refreshLock({}))
        await second.process(refreshLock({}))
      }),
      [
        refreshLocked({ nodeId: first.nodeId }),
        refreshLocked({ nodeId: first.nodeId })
      ]
    )

    deepEqual(
      await collect(first, async () => {
        await first.process(refreshLock({}))
        await second.process(refreshUnlock({}))
      }),
      [refreshLocked({ nodeId: first.nodeId })]
    )

    deepEqual(
      await collect(second, async () => {
        await first.process(refreshUnlock({}))
      }),
      [refreshUnlocked({})]
    )

    deepEqual(
      await collect(first, async () => {
        await second.process(refreshLock({}))
      }),
      [refreshLocked({ nodeId: second.nodeId })]
    )
  })

  test('unlocks on holder disconnect', async () => {
    await using server = buildTestServer()
    let { session } = await signUpUser(server, '0000000000000000')
    let holder = await connect(server, session)
    let other = await connect(server, session)
    await holder.process(refreshLock({}))
    await setTimeout(10)

    let late = new TestClient(server, '0000000000000000', { token: session })
    deepEqual(
      await collect(late, async () => {
        await Promise.all([
          waitReceived(late, refreshLocked.type),
          late.connect()
        ])
      }),
      [refreshLocked({ nodeId: holder.nodeId })]
    )

    deepEqual(
      await collect(other, async () => {
        await late.disconnect()
      }),
      []
    )

    deepEqual(
      await collect(other, async () => {
        await Promise.all([
          waitReceived(other, refreshUnlocked.type),
          holder.disconnect()
        ])
      }),
      [refreshUnlocked({})]
    )
  })

  test('unlocks silent holder', async t => {
    await using server = buildTestServer()
    let { session } = await signUpUser(server, '0000000000000000')
    let holder = await connect(server, session)
    let other = await connect(server, session)
    let silences: (() => void)[] = []
    let original = globalThis.setTimeout
    t.mock.method(
      globalThis,
      'setTimeout',
      (cb: () => void, ms: number): ReturnType<typeof original> => {
        if (new Error().stack!.includes('modules/refresh.ts')) {
          silences.push(cb)
          return original(() => {}, ms)
        }
        return original(cb, ms)
      }
    )

    deepEqual(
      await collect(other, async () => {
        await holder.process(refreshLock({}))
      }),
      [refreshLocked({ nodeId: holder.nodeId })]
    )
    let touches = silences.length
    await holder.process(zeroClean({ id: `0 ${holder.nodeId} 0` }))
    await setTimeout(10)
    ok(silences.length > touches)
    touches = silences.length
    await other.process(zeroClean({ id: `0 ${other.nodeId} 0` }))
    await setTimeout(10)
    equal(silences.length, touches)
    await holder.process(refreshLock({}))
    ok(silences.length > touches)

    deepEqual(
      await collect(other, () => {
        silences.at(-1)!()
        return Promise.resolve()
      }),
      [refreshUnlocked({})]
    )
  })
})
