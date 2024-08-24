import { TestServer } from '@logux/server'
import { eq } from 'drizzle-orm'
import { ok } from 'node:assert'
import { afterEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import { db, sessions, users } from '../db/index.ts'
// import { db } from '../db/index.ts'
import authModule from '../modules/auth.ts'
import { cleanAllTables } from './utils.ts'

let server: TestServer | undefined
afterEach(async () => {
  await cleanAllTables()
  if (server) server.destroy()
})

test('allows users with right session token', async () => {
  server = new TestServer()
  authModule(server)

  await db.insert(users).values({ id: '10' })
  await db.insert(sessions).values({ token: 'good', userId: '10' })

  await server.connect('10', { cookie: { session: 'good' } })
  await server.connect('10', { token: 'good' })
  await server.expectWrongCredentials('10')
  await server.expectWrongCredentials('10', { token: 'bad' })
  await server.expectWrongCredentials('11', { token: 'good' })
})

test('records last session used time', async () => {
  server = new TestServer()
  authModule(server)

  await db.insert(users).values({ id: '10' })
  await db.insert(sessions).values({ id: 1, token: 'good', userId: '10' })

  await server.connect('10', { cookie: { session: 'good' } })
  await setTimeout(100)

  let session = await db.query.sessions.findFirst({ where: eq(sessions.id, 1) })
  ok(session!.usedAt.valueOf() > Date.now() - 1000)
})
