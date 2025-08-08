import { zero } from '@logux/actions'
import type { TestServer } from '@logux/server'
import { deleteUser, signIn, signUp } from '@slowreader/api'
import { deepStrictEqual, equal } from 'node:assert'
import { afterEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import { db } from '../db/index.ts'
import {
  buildTestServer,
  cleanAllTables,
  testRequest,
  throws
} from './utils.ts'

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

  await clientA1.process(zero({ d: 'a', iv: 'a', z: false }))
  await clientB.process(zero({ d: 'b', iv: 'b', z: false }))

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

  deepStrictEqual(
    await db.query.actions.findMany({ columns: { userId: true } }),
    [{ userId: userB.userId }]
  )
})
