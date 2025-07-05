import { TestServer } from '@logux/server'
import {
  deletePassword,
  setPassword,
  signIn,
  signOut,
  signUp
} from '@slowreader/api'
import { eq } from 'drizzle-orm'
import { deepStrictEqual, equal, notEqual, ok } from 'node:assert'
import { afterEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import { db, sessions } from '../db/index.ts'
import authModule from '../modules/auth.ts'
import passwordModule from '../modules/passwords.ts'
import { cleanAllTables, throws } from './utils.ts'

let server: TestServer | undefined
afterEach(async () => {
  await cleanAllTables()
  await server?.destroy()
  server = undefined
})

test('creates users and check credentials', async () => {
  server = new TestServer()
  authModule(server)
  passwordModule(server)

  let sessionCookie: string | undefined
  let userA = await signUp(
    { password: 'PA', userId: 'a' },
    {
      fetch: server.fetch,
      response(res) {
        sessionCookie = res.headers.get('Set-Cookie')!
      }
    }
  )
  equal(userA.userId, 'a')
  equal(typeof userA.session, 'string')
  equal(sessionCookie, `session=${userA.session}; HttpOnly; Path=/; Secure`)

  let userB = await signUp(
    { password: 'PB', userId: 'B' },
    { fetch: server.fetch }
  )
  notEqual(userB.session, userA.session)

  let session1 = await db.query.sessions.findFirst({
    where: eq(sessions.token, userA.session)
  })
  ok(session1!.createdAt.valueOf() > Date.now() - 1000)
  ok(session1!.usedAt.valueOf() > Date.now() - 1000)

  await setTimeout(100)
  await server.expectWrongCredentials(userA.userId)
  await server.expectWrongCredentials(userA.userId, {
    cookie: { session: userB.session }
  })
  await server.connect(userA.userId, {
    cookie: { session: userA.session }
  })
  let session2 = await db.query.sessions.findFirst({
    where: eq(sessions.token, userA.session)
  })
  equal(session1!.createdAt.valueOf(), session2!.createdAt.valueOf())
  ok(session2!.usedAt.valueOf() > session1!.usedAt.valueOf())

  let signOutResponse = await server.fetch('/session', {
    body: '{}',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `session=${userA.session}`
    },
    method: 'DELETE'
  })
  equal(signOutResponse.status, 200)
  equal(
    signOutResponse.headers.get('Set-Cookie'),
    `session=; Max-Age=0; HttpOnly; Path=/; Secure`
  )
  await server.expectWrongCredentials(userA.userId, {
    cookie: { session: userA.session }
  })
  let sessions1 = await db.query.sessions.findMany({
    where: eq(sessions.userId, userA.userId)
  })
  deepStrictEqual(sessions1, [])

  await throws(async () => {
    await signIn(
      { password: 'PB', userId: userA.userId },
      { fetch: server!.fetch }
    )
  }, 'Invalid request')

  await setTimeout(100)
  let token1 = await signIn(
    { password: 'PA', userId: userA.userId },
    { fetch: server.fetch }
  )
  let client2 = await server.connect(userA.userId, {
    cookie: { session: token1.session }
  })
  let session3 = await db.query.sessions.findFirst({
    where: eq(sessions.token, token1.session)
  })
  ok(session3!.usedAt.valueOf() > session2!.usedAt.valueOf())

  await client2.process(deletePassword({}))
  await throws(async () => {
    await signIn(
      { password: 'PA', userId: userA.userId },
      { fetch: server!.fetch }
    )
  }, 'Invalid request')

  await client2.process(setPassword({ password: 'new' }))
  await signIn(
    { password: 'new', userId: userA.userId },
    { fetch: server.fetch }
  )
})

test('disconnects current client on signOut', async () => {
  server = new TestServer()
  authModule(server)
  passwordModule(server)
  let userA = await signUp(
    { password: 'A', userId: 'a' },
    { fetch: server.fetch }
  )
  let session1 = await signIn(
    { password: 'A', userId: userA.userId },
    { fetch: server.fetch }
  )
  let client1 = await server.connect(userA.userId, { token: session1.session })
  let session2 = await signIn(
    { password: 'A', userId: userA.userId },
    { fetch: server.fetch }
  )
  let client2 = await server.connect(userA.userId, {
    cookie: { session: session2.session }
  })

  await signOut({ session: session1.session }, { fetch: server.fetch })
  equal(client1.pair.right.connected, false)
  equal(client2.pair.right.connected, true)
})

test('does not allow to set password for another user', async () => {
  server = new TestServer()
  authModule(server)
  passwordModule(server)
  let userA = await signUp(
    { password: 'A', userId: 'a' },
    { fetch: server.fetch }
  )
  let userB = await signUp(
    { password: 'B', userId: 'b' },
    { fetch: server.fetch }
  )
  let clientA = await server.connect(userA.userId, { token: userA.session })
  await server.expectDenied(async () => {
    await clientA.process(
      setPassword({ password: 'Hacked', userId: userB.userId })
    )
  })
})

test('does not allow to redefine user', async () => {
  server = new TestServer()
  authModule(server)
  passwordModule(server)

  let userA = await signUp(
    { password: 'A', userId: 'a' },
    { fetch: server.fetch }
  )
  await throws(async () => {
    await signUp(
      { password: 'B', userId: userA.userId },
      { fetch: server!.fetch }
    )
  }, 'Invalid request')
})

test('has non-cookie API', async () => {
  server = new TestServer()
  authModule(server)

  let user = await signUp(
    { password: 'P', userId: 'a' },
    { fetch: server.fetch }
  )
  await server.connect(user.userId, { token: user.session })
  await signOut({ session: user.session }, { fetch: server.fetch })
  await server.expectWrongCredentials(user.userId, { token: user.session })
})

test('validates request body', async () => {
  server = new TestServer()
  authModule(server)

  let response1 = await server.fetch('/users', { method: 'PUT' })
  equal(await response1.text(), 'Not found')
  let response2 = await server.fetch('/users/1', { method: 'PUT' })
  equal(await response2.text(), 'Wrong content type')
  let response3 = await server.fetch('/users/1', {
    headers: { 'Content-Type': 'application/json' },
    method: 'PUT'
  })
  equal(await response3.text(), 'Invalid JSON')
  let response4 = await server.fetch('/users/1', {
    body: '{',
    headers: { 'Content-Type': 'application/json' },
    method: 'PUT'
  })
  equal(await response4.text(), 'Invalid JSON')
  let response5 = await server.fetch('/users/1', {
    body: '{"id":"1"}',
    headers: { 'Content-Type': 'application/json' },
    method: 'PUT'
  })
  equal(await response5.text(), 'Invalid body')
  let response6 = await server.fetch('/users/1', {
    body: '{"id":"2","password":"test"}',
    headers: { 'Content-Type': 'application/json' },
    method: 'PUT'
  })
  equal(await response6.text(), 'Invalid body')
  await throws(async () => {
    await signOut({}, { fetch: server!.fetch })
  }, 'Invalid request')
})
