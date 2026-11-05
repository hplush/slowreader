import type { BaseServer } from '@logux/server'
import { sendEventsEndpoint } from '@slowreader/api'

import { config } from '../lib/config.ts'
import { jsonApi, tooManyRequests } from '../lib/http.ts'
import { eventsByIp, requestIp } from '../lib/limits.ts'
import { eventCounts } from '../lib/metrics.ts'

export default (server: BaseServer, token = config.analyticsToken): void => {
  if (!token) return

  jsonApi(server, sendEventsEndpoint, (params, res, req) => {
    let ip = requestIp(req)
    if (eventsByIp.isOver(ip)) return tooManyRequests()
    eventsByIp.add(ip)
    for (let name of params.events) {
      eventCounts.set(name, (eventCounts.get(name) ?? 0) + 1)
    }
    return {}
  })
}
