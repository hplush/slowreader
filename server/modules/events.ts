import type { BaseServer } from '@logux/server'
import { sendEventsEndpoint } from '@slowreader/api'
import { sql } from 'drizzle-orm'

import { db, events } from '../db/index.ts'
import { config } from '../lib/config.ts'
import { jsonApi, tooManyRequests } from '../lib/http.ts'
import { eventsByIp, requestIp } from '../lib/limits.ts'

export default (server: BaseServer, token = config.analyticsToken): void => {
  if (!token) return

  jsonApi(server, sendEventsEndpoint, async (params, res, req) => {
    let ip = requestIp(req)
    if (eventsByIp.isOver(ip)) return tooManyRequests()
    eventsByIp.add(ip)
    await db
      .insert(events)
      .values(
        params.events.map(name => ({ count: 1, date: sql`current_date`, name }))
      )
      .onConflictDoUpdate({
        set: { count: sql`${events.count} + 1` },
        target: [events.date, events.name]
      })
    return {}
  })
}
