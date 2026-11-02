import { eq, sql } from 'drizzle-orm'
import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, describe, mock, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import { analytics, db, events, sessions } from '../db/index.ts'
import analyticsModule from '../modules/analytics.ts'
import {
  buildTestServer,
  cleanAllTables,
  FakeAuthenticator,
  signUpUser
} from './utils.ts'

const TOKEN = 'T'.repeat(32)

function request(
  server: ReturnType<typeof buildTestServer>,
  authorization?: string
): Promise<Response> {
  return server.fetch('/analytics', {
    headers: authorization ? { Authorization: authorization } : {}
  })
}

async function setDevice(
  userId: string,
  device: string,
  usedAt: string
): Promise<void> {
  await db
    .update(sessions)
    .set({ device, usedAt: sql.raw(`now() - interval '${usedAt}'`) })
    .where(eq(sessions.userId, userId))
}

describe('server analytics', () => {
  afterEach(async () => {
    mock.timers.reset()
    await cleanAllTables()
  })

  test('is disabled without token', async () => {
    await using server = buildTestServer()
    analyticsModule(server, undefined)
    equal((await request(server, `Bearer ${TOKEN}`)).status, 404)
  })

  test('checks token and limits attempts', async () => {
    await using server = buildTestServer()
    analyticsModule(server, TOKEN)
    equal((await request(server)).status, 401)
    equal((await request(server, TOKEN)).status, 401)
    for (let i = 0; i < 8; i++) {
      equal((await request(server, `Bearer ${'W'.repeat(32)}`)).status, 401)
    }
    equal((await request(server, `Bearer ${TOKEN}`)).status, 429)
  })

  test('returns statistics and history', async () => {
    await using server = buildTestServer()
    analyticsModule(server, TOKEN)

    let passkey = new FakeAuthenticator()
    let online = await signUpUser(server, '0000000000000000')
    await signUpUser(server, '0000000000000001', passkey)
    await signUpUser(server, '0000000000000002')
    await signUpUser(server, '0000000000000003')
    await setDevice('0000000000000000', 'Chrome|Linux', '40 days')
    await setDevice('0000000000000001', 'Firefox|Windows', '1 hour')
    await setDevice('0000000000000002', 'Chrome|', '10 days')
    await setDevice('0000000000000003', '|macOS', '40 days')
    await server.connect('0000000000000000', {
      cookie: { session: online.session }
    })
    await setDevice('0000000000000000', 'Chrome|Linux', '40 days')

    await db.insert(analytics).values({
      browsers: {},
      dau: 0,
      date: '2026-10-01',
      mau: 0,
      passkeys: { '0': 1, '1': 0, '2': 0, '3+': 0 },
      systems: {},
      users: 1
    })
    await db
      .insert(events)
      .values({ count: 2, date: '2026-10-01', name: 'fatal-crash' })

    let response = await request(server, `Bearer ${TOKEN}`)
    equal(response.status, 200)
    deepEqual(await response.json(), {
      events: [{ count: 2, date: '2026-10-01', name: 'fatal-crash' }],
      history: [
        {
          browsers: {},
          dau: 0,
          date: '2026-10-01',
          mau: 0,
          passkeys: { '0': 1, '1': 0, '2': 0, '3+': 0 },
          systems: {},
          users: 1
        }
      ],
      now: {
        browsers: { Chrome: 1, Firefox: 1 },
        dau: 2,
        mau: 3,
        online: 1,
        passkeys: { '0': 2, '1': 1, '2': 0, '3+': 0 },
        systems: { Other: 1, Windows: 1 },
        users: 4
      }
    })
  })

  test('saves daily snapshot', async () => {
    mock.timers.enable({ apis: ['setInterval'] })
    await using server = buildTestServer()
    analyticsModule(server, TOKEN)
    await signUpUser(server, '0000000000000000')

    mock.timers.tick(60 * 60 * 1000)
    mock.timers.tick(60 * 60 * 1000)
    let rows = await db.select().from(analytics)
    for (let i = 0; i < 100 && rows.length === 0; i++) {
      await setTimeout(10)
      rows = await db.select().from(analytics)
    }
    equal(rows.length, 1)
    deepEqual(
      { ...rows[0], date: undefined },
      {
        browsers: { Other: 1 },
        dau: 1,
        date: undefined,
        mau: 1,
        passkeys: { '0': 1, '1': 0, '2': 0, '3+': 0 },
        systems: { Other: 1 },
        users: 1
      }
    )
  })
})
