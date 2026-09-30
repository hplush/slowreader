import { zero } from '@logux/actions'
import { parseId } from '@logux/core'
import { deleteUser, signIn } from '@slowreader/api'
import { equal } from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import { challenges, db } from '../db/index.ts'
import {
  buildTestServer,
  cleanAllTables,
  getChallenge,
  getServerLogIds,
  signUpUser,
  testRequest,
  throws
} from './utils.ts'

describe('server users', () => {
  afterEach(async () => {
    await cleanAllTables()
  })

  test('deletes users', async () => {
    await using server = buildTestServer()

    let userA = await signUpUser(server, '0000000000000000')
    let userB = await signUpUser(server, '0000000000000001')
    let sessionA2 = await testRequest(server, signIn, {
      password: { authKey: userA.key },
      userId: '0000000000000000'
    })

    let clientA1 = await server.connect('0000000000000000', {
      cookie: { session: userA.session }
    })
    let clientA2 = await server.connect('0000000000000000', {
      cookie: { session: sessionA2.session }
    })
    let clientB = await server.connect('0000000000000001', {
      cookie: { session: userB.session }
    })

    await clientA1.process(
      zero({ compressed: false, d: Buffer.from('a'), iv: Buffer.from('a') })
    )
    await clientB.process(
      zero({ compressed: false, d: Buffer.from('b'), iv: Buffer.from('b') })
    )

    await getChallenge(server, 'reauth', userA.session)
    await getChallenge(server, 'reauth', userB.session)

    await server.expectDenied(async () => {
      await clientA1.process({ ...deleteUser({}), extra: 1 })
    })
    await clientA1.process(deleteUser({}))
    await setTimeout(100)
    equal(clientA1.node.state, 'disconnected')
    equal(clientA2.node.state, 'disconnected')
    equal(clientB.node.state, 'synchronized')

    await server.expectWrongCredentials('0000000000000000', {
      cookie: { session: userA.session }
    })
    await server.expectWrongCredentials('0000000000000000', {
      cookie: { session: sessionA2.session }
    })
    await throws(async () => {
      await testRequest(server, signIn, {
        password: { authKey: userA.key },
        userId: '0000000000000000'
      })
    }, 'Invalid credentials')

    let left = await db.select().from(challenges)
    equal(left.length, 1)
    equal(left[0]!.userId, '0000000000000001')

    let stored = await getServerLogIds()
    equal(stored.length, 1)
    equal(parseId(stored[0]!).userId, '0000000000000001')
  })
})
