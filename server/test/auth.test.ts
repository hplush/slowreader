import type { TestServer } from '@logux/server'
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

test('creates users and check credentials', async () => {
  server = buildTestServer()

  let sessionCookie: string | undefined
  let userA = await testRequest(
    server,
    signUp,
    { password: 'AAAAAAAAAA', userId: '0000000000000000' },
    res => {
      sessionCookie = res.headers.get('Set-Cookie')!
    }
  )
  equal(userA.userId, '0000000000000000')
  equal(typeof userA.session, 'string')
  ok(sessionCookie?.includes(`session=${userA.session}`))

  let userB = await testRequest(server, signUp, {
    password: 'BBBBBBBBBB',
    userId: '0000000000000001'
  })
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
  ok(signOutResponse.headers.get('Set-Cookie')?.includes(`session=;`))
  await server.expectWrongCredentials(userA.userId, {
    cookie: { session: userA.session }
  })
  let sessions1 = await db.query.sessions.findMany({
    where: eq(sessions.userId, userA.userId)
  })
  deepStrictEqual(sessions1, [])

  await throws(async () => {
    await testRequest(server!, signIn, {
      password: 'BBBBBBBBBB',
      userId: userA.userId
    })
  }, 'Invalid credentials')

  await setTimeout(100)
  let token1 = await testRequest(server, signIn, {
    password: 'AAAAAAAAAA',
    userId: userA.userId
  })
  let client2 = await server.connect(userA.userId, {
    cookie: { session: token1.session }
  })
  let session3 = await db.query.sessions.findFirst({
    where: eq(sessions.token, token1.session)
  })
  ok(session3!.usedAt.valueOf() > session2!.usedAt.valueOf())

  await client2.process(deletePassword({}))
  await throws(async () => {
    await testRequest(server!, signIn, {
      password: 'AAAAAAAAAA',
      userId: userA.userId
    })
  }, 'Invalid credentials')

  await client2.process(setPassword({ password: 'new' }))
  await testRequest(server, signIn, { password: 'new', userId: userA.userId })
})

test('disconnects current client on signOut', async () => {
  server = buildTestServer()
  let userA = await testRequest(server, signUp, {
    password: 'AAAAAAAAAA',
    userId: '0000000000000000'
  })
  let session1 = await testRequest(server, signIn, {
    password: 'AAAAAAAAAA',
    userId: userA.userId
  })
  let client1 = await server.connect(userA.userId, { token: session1.session })
  let session2 = await testRequest(server, signIn, {
    password: 'AAAAAAAAAA',
    userId: userA.userId
  })
  let client2 = await server.connect(userA.userId, {
    cookie: { session: session2.session }
  })

  await signOut({ session: session1.session }, { fetch: server.fetch })
  equal(client1.pair.right.connected, false)
  equal(client2.pair.right.connected, true)
})

test('does not allow to set password for another user', async () => {
  server = buildTestServer()
  let userA = await testRequest(server, signUp, {
    password: 'AAAAAAAAAA',
    userId: '0000000000000000'
  })
  let userB = await testRequest(server, signUp, {
    password: 'BBBBBBBBBB',
    userId: '0000000000000001'
  })
  let clientA = await server.connect(userA.userId, { token: userA.session })
  await server.expectDenied(async () => {
    await clientA.process(
      setPassword({ password: 'Hacked', userId: userB.userId })
    )
  })
})

test('does not allow to redefine user', async () => {
  server = buildTestServer()
  let userA = await testRequest(server, signUp, {
    password: 'AAAAAAAAAA',
    userId: '0000000000000000'
  })
  await throws(async () => {
    await testRequest(server!, signUp, {
      password: 'BBBBBBBBBB',
      userId: userA.userId
    })
  }, 'User ID was already taken')
})

test('has non-cookie API', async () => {
  server = buildTestServer()
  let user = await testRequest(server, signUp, {
    password: 'AAAAAAAAAA',
    userId: '0000000000000000'
  })
  await server.connect(user.userId, { token: user.session })
  await signOut({ session: user.session }, { fetch: server.fetch })
  await server.expectWrongCredentials(user.userId, { token: user.session })
})

test('validates request body', async () => {
  server = buildTestServer()
  let response1 = await server.fetch('/users', { method: 'PUT' })
  equal(await response1.text(), 'Not found\n')
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
    await testRequest(server!, signOut, {})
  }, 'Invalid request')

  await throws(async () => {
    await testRequest(server!, signUp, {
      password: 'wrong format',
      userId: 'bad'
    })
  }, 'Invalid request')
})

test('supports CORS', async () => {
  server = buildTestServer()
  let option = await server.fetch('/users/1', {
    body: '{"id":"2","password":"test"}',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'https://dev.slowreader.app'
    },
    method: 'OPTIONS'
  })
  equal(
    option.headers.get('Access-Control-Allow-Origin'),
    'https://dev.slowreader.app'
  )
  let real = await server.fetch('/users/1', {
    body: '{"id":"2","password":"test"}',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'https://dev.slowreader.app'
    },
    method: 'POST'
  })
  equal(
    real.headers.get('Access-Control-Allow-Origin'),
    'https://dev.slowreader.app'
  )
})
