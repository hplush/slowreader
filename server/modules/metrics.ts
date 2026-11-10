import type { AnalyticsStats } from '@slowreader/api'
import { count, sql } from 'drizzle-orm'
import { createHash, timingSafeEqual } from 'node:crypto'
import type { ServerResponse } from 'node:http'

import { db, passkeys, sessions, users } from '../db/index.ts'
import { config } from '../lib/config.ts'
import { failedMetrics, requestIp } from '../lib/limits.ts'
import { eventCounts, formatMetric } from '../lib/metrics.ts'
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

async function collectAnalytics(server: AppServer): Promise<AnalyticsStats> {
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
  let userSessions: Record<string, number> = {}
  let userPlatforms = new Map<string, Set<'desktop' | 'mobile'>>()
  for (let session of recent) {
    monthly.add(session.userId)
    if (session.today) daily.add(session.userId)
    let [browser, os] = session.device.split('|')
    increase(browsers, browser || 'Other')
    increase(systems, os || 'Other')
    increase(userSessions, session.userId)
    let platforms = userPlatforms.get(session.userId) ?? new Set()
    platforms.add(os === 'Android' || os === 'iOS' ? 'mobile' : 'desktop')
    userPlatforms.set(session.userId, platforms)
  }
  let clients: AnalyticsStats['clients'] = { '1': 0, '2': 0, '3': 0, '4+': 0 }
  for (let amount of Object.values(userSessions)) {
    increase(clients, amount >= 4 ? '4+' : String(amount))
  }
  let platforms: AnalyticsStats['platforms'] = {
    both: 0,
    desktop: 0,
    mobile: 0
  }
  for (let types of userPlatforms.values()) {
    increase(platforms, types.size > 1 ? 'both' : [...types][0]!)
  }
  let perUser = new Map(keys.map(i => [i.userId, i.value]))
  let distribution: AnalyticsStats['passkeys'] = {
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
    clients,
    dau: daily.size,
    mau: monthly.size,
    online: online.size,
    passkeys: distribution,
    platforms,
    systems,
    users: total[0]!.value
  }
}

export default (server: AppServer, token = config.analyticsToken): void => {
  if (!token) return
  let expected = hash(token)

  server.http('GET', '/metrics', async (req, res) => {
    let ip = requestIp(req)
    if (failedMetrics.isOver(ip)) {
      sendText(res, 429, 'Too many requests')
      return
    }
    let header = req.headers.authorization ?? ''
    let given = hash(header.replace(/^Bearer /, ''))
    if (!header.startsWith('Bearer ') || !timingSafeEqual(given, expected)) {
      failedMetrics.add(ip)
      sendText(res, 401, 'Wrong token')
      return
    }
    let stats = await collectAnalytics(server)
    res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4' })
    res.end(
      formatMetric('slowreader_users', 'gauge', stats.users) +
        formatMetric('slowreader_daily_users', 'gauge', stats.dau) +
        formatMetric('slowreader_monthly_users', 'gauge', stats.mau) +
        formatMetric('slowreader_online_users', 'gauge', stats.online) +
        formatMetric(
          'slowreader_monthly_users_by_passkeys',
          'gauge',
          stats.passkeys,
          'passkeys'
        ) +
        formatMetric(
          'slowreader_monthly_users_by_clients',
          'gauge',
          stats.clients,
          'clients'
        ) +
        formatMetric(
          'slowreader_monthly_users_by_platforms',
          'gauge',
          stats.platforms,
          'platforms'
        ) +
        formatMetric(
          'slowreader_monthly_sessions_by_browser',
          'gauge',
          stats.browsers,
          'browser'
        ) +
        formatMetric(
          'slowreader_monthly_sessions_by_system',
          'gauge',
          stats.systems,
          'system'
        ) +
        formatMetric(
          'slowreader_events_total',
          'counter',
          Object.fromEntries(eventCounts),
          'name'
        )
    )
  })
}
