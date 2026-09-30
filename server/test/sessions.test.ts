import {
  changedSessionAction,
  createdSessionAction,
  deletedSessionAction,
  deleteOtherSessions,
  deleteSessionAction,
  loadedSessionsAction,
  signIn
} from '@slowreader/api'
import { deepEqual, equal, ok } from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import { db, sessions } from '../db/index.ts'
import {
  buildTestServer,
  cleanAllTables,
  signUpUser,
  testRequest
} from './utils.ts'

describe('server sessions', () => {
  afterEach(async () => {
    await cleanAllTables()
  })

  test('lists sessions with online status', async () => {
    await using server = buildTestServer()
    let user = await signUpUser(server, '0000000000000000')
    let other = await testRequest(server, signIn, {
      password: { authKey: user.key },
      userId: '0000000000000000'
    })
    let client = await server.connect('0000000000000000', {
      token: user.session
    })
    let list = await client.subscribe('users/0000000000000000/sessions')
    let loaded = list.find(loadedSessionsAction.match)!
    let currentId = loaded.current
    equal(loaded.sessions.length, 2)
    equal(loaded.sessions.find(i => i.id === currentId)!.online, true)
    equal(loaded.sessions.find(i => i.id !== currentId)!.online, false)
    await server.expectDenied(async () => {
      await client.process(
        loadedSessionsAction({ current: null, sessions: [] })
      )
    })
    await server.expectDenied(async () => {
      await client.process(
        createdSessionAction({
          ...loaded.sessions[0]!,
          userId: '0000000000000001'
        })
      )
    })
    await server.expectDenied(async () => {
      await client.process(
        changedSessionAction({
          id: currentId!,
          online: false,
          usedAt: 0,
          userId: '0000000000000001'
        })
      )
    })
    await server.expectDenied(async () => {
      await client.process(
        deletedSessionAction({ id: currentId!, userId: '0000000000000001' })
      )
    })

    let otherId = loaded.sessions.find(i => i.id !== currentId)!.id
    let online = await client.collect(async () => {
      await server.connect('0000000000000000', { token: other.session })
      await setTimeout(50)
    })
    deepEqual(
      online.filter(changedSessionAction.match).map(i => i.id),
      [otherId]
    )
  })

  test('deletes sessions', async () => {
    await using server = buildTestServer()
    let user = await signUpUser(server, '0000000000000000')
    let other = await testRequest(server, signIn, {
      password: { authKey: user.key },
      userId: '0000000000000000'
    })
    let third = await testRequest(server, signIn, {
      password: { authKey: user.key },
      userId: '0000000000000000'
    })
    let client = await server.connect('0000000000000000', {
      token: user.session
    })
    let otherClient1 = await server.connect('0000000000000000', {
      token: other.session
    })
    let otherClient2 = await server.connect('0000000000000000', {
      cookie: { session: other.session }
    })
    let thirdClient = await server.connect('0000000000000000', {
      token: third.session
    })
    let otherId = server.clientIds.get(otherClient1.clientId)!.data.sessionId

    await server.expectDenied(async () => {
      await client.process({
        ...deleteSessionAction({ id: otherId }),
        extra: 1
      })
    })
    await server.expectDenied(async () => {
      await client.process({ id: 1, type: 'sessions/delete' })
    })
    await client.process(deleteSessionAction({ id: otherId }))
    equal(otherClient1.pair.right.connected, false)
    equal(otherClient2.pair.right.connected, false)
    equal(thirdClient.pair.right.connected, true)
    await server.expectWrongCredentials('0000000000000000', {
      token: other.session
    })

    await server.expectDenied(async () => {
      await client.process({ ...deleteOtherSessions({}), extra: 1 })
    })
    await client.process(deleteOtherSessions({}))
    equal(thirdClient.pair.right.connected, false)
    equal(client.pair.right.connected, true)
    equal((await db.query.sessions.findMany()).length, 1)
  })

  test('does not allow to delete sessions of another user', async () => {
    await using server = buildTestServer()
    let userA = await signUpUser(server, '0000000000000000')
    let userB = await signUpUser(server, '0000000000000001')
    let clientA = await server.connect('0000000000000000', {
      token: userA.session
    })
    let clientB = await server.connect('0000000000000001', {
      token: userB.session
    })
    let sessionB = server.clientIds.get(clientB.clientId)!.data.sessionId
    await server.expectDenied(async () => {
      await clientA.process(deleteSessionAction({ id: sessionB }))
    })
    await server.expectDenied(async () => {
      await clientA.subscribe('users/0000000000000001/sessions')
    })
    let list = await clientA.subscribe('users/0000000000000000/sessions')
    ok(!JSON.stringify(list).includes(sessionB))
    equal(clientB.pair.right.connected, true)
  })

  test('rejects connection revoked during authentication', async () => {
    await using server = buildTestServer()
    let user = await signUpUser(server, '0000000000000000')
    let original = db.query.sessions.findFirst.bind(db.query.sessions)
    db.query.sessions.findFirst = (async (...args) => {
      db.query.sessions.findFirst = original
      let result = await original(...args)
      await db.delete(sessions)
      return result
    }) as typeof original
    await server.expectWrongCredentials('0000000000000000', {
      token: user.session
    })
  })

  test('removes the least recently used session over limit', async () => {
    await using server = buildTestServer()
    let user = await signUpUser(server, '0000000000000000')
    let first = await db.query.sessions.findFirst()
    await db.update(sessions).set({ usedAt: new Date(Date.now() - 10000) })
    await db.insert(sessions).values(
      Array.from({ length: 99 }, (_, i) => ({
        device: '|',
        id: `session${i}`,
        tokenHash: `hash${i}`,
        userId: '0000000000000000'
      }))
    )
    await testRequest(server, signIn, {
      password: { authKey: user.key },
      userId: '0000000000000000'
    })
    let rows = await db.query.sessions.findMany()
    equal(rows.length, 100)
    ok(!rows.some(i => i.id === first!.id))
  })
})
