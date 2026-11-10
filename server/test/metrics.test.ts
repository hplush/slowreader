import { eq, sql } from 'drizzle-orm'
import { equal } from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import { db, sessions } from '../db/index.ts'
import { eventCounts } from '../lib/metrics.ts'
import metricsModule from '../modules/metrics.ts'
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
  return server.fetch('/metrics', {
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

async function addSession(
  userId: string,
  device: string,
  usedAt: string
): Promise<void> {
  let id = `${userId}${device}`
  await db.insert(sessions).values({
    device,
    id,
    tokenHash: id,
    usedAt: sql.raw(`now() - interval '${usedAt}'`),
    userId
  })
}

describe('server metrics', () => {
  afterEach(async () => {
    await cleanAllTables()
  })

  test('is disabled without token', async () => {
    await using server = buildTestServer()
    metricsModule(server, undefined)
    equal((await request(server, `Bearer ${TOKEN}`)).status, 404)
  })

  test('checks token and limits attempts', async () => {
    await using server = buildTestServer()
    metricsModule(server, TOKEN)
    equal((await request(server)).status, 401)
    equal((await request(server, TOKEN)).status, 401)
    for (let i = 0; i < 8; i++) {
      equal((await request(server, `Bearer ${'W'.repeat(32)}`)).status, 401)
    }
    equal((await request(server, `Bearer ${TOKEN}`)).status, 429)
  })

  test('returns statistics and events', async () => {
    await using server = buildTestServer()
    metricsModule(server, TOKEN)

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
    await setDevice('0000000000000001', 'Fire"fox\\\n|Windows', '1 hour')
    await addSession('0000000000000001', 'Safari|iOS', '5 days')
    await addSession('0000000000000001', 'Chrome|Android', '5 days')
    await addSession('0000000000000001', 'Firefox|Linux', '5 days')
    await addSession('0000000000000003', 'Safari|iOS', '5 days')
    eventCounts.set('fatal-crash', 2)

    let response = await request(server, `Bearer ${TOKEN}`)
    equal(response.status, 200)
    equal(response.headers.get('content-type'), 'text/plain; version=0.0.4')
    equal(
      await response.text(),
      '# TYPE slowreader_users gauge\n' +
        'slowreader_users 4\n' +
        '# TYPE slowreader_daily_users gauge\n' +
        'slowreader_daily_users 2\n' +
        '# TYPE slowreader_monthly_users gauge\n' +
        'slowreader_monthly_users 4\n' +
        '# TYPE slowreader_online_users gauge\n' +
        'slowreader_online_users 1\n' +
        '# TYPE slowreader_monthly_users_by_passkeys gauge\n' +
        'slowreader_monthly_users_by_passkeys{passkeys="0"} 3\n' +
        'slowreader_monthly_users_by_passkeys{passkeys="1"} 1\n' +
        'slowreader_monthly_users_by_passkeys{passkeys="2"} 0\n' +
        'slowreader_monthly_users_by_passkeys{passkeys="3+"} 0\n' +
        '# TYPE slowreader_monthly_users_by_clients gauge\n' +
        'slowreader_monthly_users_by_clients{clients="1"} 2\n' +
        'slowreader_monthly_users_by_clients{clients="2"} 0\n' +
        'slowreader_monthly_users_by_clients{clients="3"} 0\n' +
        'slowreader_monthly_users_by_clients{clients="4+"} 1\n' +
        '# TYPE slowreader_monthly_users_by_platforms gauge\n' +
        'slowreader_monthly_users_by_platforms{platforms="both"} 1\n' +
        'slowreader_monthly_users_by_platforms{platforms="desktop"} 1\n' +
        'slowreader_monthly_users_by_platforms{platforms="mobile"} 1\n' +
        '# TYPE slowreader_monthly_sessions_by_browser gauge\n' +
        'slowreader_monthly_sessions_by_browser{browser="Chrome"} 2\n' +
        'slowreader_monthly_sessions_by_browser{browser="Fire\\"fox\\\\\\n"} 1\n' +
        'slowreader_monthly_sessions_by_browser{browser="Firefox"} 1\n' +
        'slowreader_monthly_sessions_by_browser{browser="Safari"} 2\n' +
        '# TYPE slowreader_monthly_sessions_by_system gauge\n' +
        'slowreader_monthly_sessions_by_system{system="Android"} 1\n' +
        'slowreader_monthly_sessions_by_system{system="Linux"} 1\n' +
        'slowreader_monthly_sessions_by_system{system="Other"} 1\n' +
        'slowreader_monthly_sessions_by_system{system="Windows"} 1\n' +
        'slowreader_monthly_sessions_by_system{system="iOS"} 2\n' +
        '# TYPE slowreader_events_total counter\n' +
        'slowreader_events_total{name="fatal-crash"} 2\n'
    )
  })
})
