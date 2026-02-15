import type { BaseServer } from '@logux/server'
import { sql } from 'drizzle-orm'

import { db } from '../db/index.ts'

export default (server: BaseServer): void => {
  server.http('GET', '/health', async (req, res) => {
    try {
      await db.execute(sql`SELECT 1`)
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end('ok\n')
      /* node:coverage ignore next 4 */
    } catch {
      res.writeHead(503, { 'Content-Type': 'text/plain' })
      res.end('error\n')
    }
  })
}
