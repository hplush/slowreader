import { zero } from '@logux/actions'
import { parseId } from '@logux/core'
import type { TestServer } from '@logux/server'
import { deleteUser, signIn, signUp } from '@slowreader/api'
import { equal } from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  buildTestServer,
  cleanAllTables,
  getServerLogIds,
  testRequest,
  throws
} from './utils.ts'

describe('server users', () => {
  let server: TestServer | undefined
  afterEach(async () => {
    await cleanAllTables()
    await server?.destroy()
    server = undefined
  })

  test('deletes users', async () => {
    server = buildTestServer()

    let userA = await testRequest(server, signUp, {
      password: 'AAAAAAAAAA',
      userId: '0000000000000000'
    })
    let userB = await testRequest(server, signUp, {
      password: 'BBBBBBBBBB',
      userId: '0000000000000001'
    })
    let sessionA2 = await testRequest(server, signIn, {
      password: 'AAAAAAAAAA',
      userId: userA.userId
    })

    let clientA1 = await server.connect(userA.userId, {
      cookie: { session: userA.session }
    })
    let clientA2 = await server.connect(userA.userId, {
      cookie: { session: sessionA2.session }
    })
    let clientB = await server.connect(userB.userId, {
      cookie: { session: userB.session }
    })

    await clientA1.process(
      zero({ compressed: false, d: Buffer.from('a'), iv: Buffer.from('a') })
    )
    await clientB.process(
      zero({ compressed: false, d: Buffer.from('b'), iv: Buffer.from('b') })
    )

    await clientA1.process(deleteUser({}))
    await setTimeout(100)
    equal(clientA1.node.state, 'disconnected')
    equal(clientA2.node.state, 'disconnected')
    equal(clientB.node.state, 'synchronized')

    await server.expectWrongCredentials(userA.userId, {
      cookie: { session: userA.session }
    })
    await server.expectWrongCredentials(userA.userId, {
      cookie: { session: sessionA2.session }
    })
    await throws(async () => {
      await testRequest(server!, signIn, {
        password: 'AAAAAAAAAA',
        userId: userA.userId
      })
    }, 'Invalid credentials')

    let stored = await getServerLogIds()
    equal(stored.length, 1)
    equal(parseId(stored[0]!).userId, userB.userId)
  })
})
