import type { AnalyticsResponse } from '@slowreader/api'
import { asc, count, sql } from 'drizzle-orm'
import { createHash, timingSafeEqual } from 'node:crypto'
import type { ServerResponse } from 'node:http'

import {
  analytics,
  db,
  events,
  passkeys,
  sessions,
  users
} from '../db/index.ts'
import { config } from '../lib/config.ts'
import { failedAnalytics, requestIp } from '../lib/limits.ts'
import type { AppServer } from '../lib/types.ts'

function increase(counts: Record<string, number>, key: string): void {
  counts[key] = (counts[key] ?? 0) + 1
}

function hash(token: string): Buffer {
  return createHash('sha256').update(token).digest()
}

function sendText(res: ServerResponse, status: number, text: string): void {
  res.writeHead(status, { 'Content-Type': 'text/plain' })
  res.end(text)
}

export async function collectAnalytics(
  server: AppServer
): Promise<AnalyticsResponse['now']> {
  let online = new Set<string>()
  for (let client of server.connected.values()) {
    if (client.userId) online.add(client.userId)
  }
  let [total, recent, keys] = await Promise.all([
    db.select({ value: count() }).from(users),
    db
      .select({
        device: sessions.device,
        today: sql<boolean>`${sessions.usedAt} > now() - interval '1 day'`,
        userId: sessions.userId
      })
      .from(sessions)
      .where(sql`${sessions.usedAt} > now() - interval '30 days'`),
    db
      .select({ userId: passkeys.userId, value: count() })
      .from(passkeys)
      .groupBy(passkeys.userId)
  ])
  let daily = new Set(online)
  let monthly = new Set(online)
  let browsers: Record<string, number> = {}
  let systems: Record<string, number> = {}
  for (let session of recent) {
    monthly.add(session.userId)
    if (session.today) daily.add(session.userId)
    let [browser, os] = session.device.split('|')
    increase(browsers, browser || 'Other')
    increase(systems, os || 'Other')
  }
  let perUser = new Map(keys.map(i => [i.userId, i.value]))
  let distribution: AnalyticsResponse['now']['passkeys'] = {
    '0': 0,
    '1': 0,
    '2': 0,
    '3+': 0
  }
  for (let userId of monthly) {
    let amount = perUser.get(userId) ?? 0
    increase(distribution, amount >= 3 ? '3+' : String(amount))
  }
  return {
    browsers,
    dau: daily.size,
    mau: monthly.size,
    online: online.size,
    passkeys: distribution,
    systems,
    users: total[0]!.value
  }
}

export async function saveAnalytics(server: AppServer): Promise<void> {
  let { online: _, ...stats } = await collectAnalytics(server)
  await db
    .insert(analytics)
    .values({ ...stats, date: sql`current_date` })
    .onConflictDoNothing()
}

export default (server: AppServer, token = config.analyticsToken): void => {
  if (!token) return
  let expected = hash(token)

  let timer = setInterval(
    () => {
      saveAnalytics(server)
        /* node:coverage ignore next 3 */
        .catch((error: unknown) => {
          server.logger.error(error)
        })
    },
    60 * 60 * 1000
  )
  server.on('destroyed', () => {
    clearInterval(timer)
  })

  server.http('GET', '/analytics', async (req, res) => {
    let ip = requestIp(req)
    if (failedAnalytics.isOver(ip)) {
      sendText(res, 429, 'Too many requests')
      return
    }
    let header = req.headers.authorization ?? ''
    let given = hash(header.replace(/^Bearer /, ''))
    if (!header.startsWith('Bearer ') || !timingSafeEqual(given, expected)) {
      failedAnalytics.add(ip)
      sendText(res, 401, 'Wrong token')
      return
    }
    let [now, history, counts] = await Promise.all([
      collectAnalytics(server),
      db.select().from(analytics).orderBy(asc(analytics.date)),
      db.select().from(events).orderBy(asc(events.date), asc(events.name))
    ])
    let body: AnalyticsResponse = { events: counts, history, now }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(body))
  })
}
