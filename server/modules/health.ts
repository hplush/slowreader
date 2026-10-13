import type { BaseServer } from '@logux/server'
import { sql } from 'drizzle-orm'
import type { IncomingMessage, ServerResponse } from 'node:http'

import { db } from '../db/index.ts'

async function checkHealth(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    await db.execute(sql`SELECT 1`)
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('OK\n')
    /* node:coverage ignore next 4 */
  } catch {
    res.writeHead(503, { 'Content-Type': 'text/plain' })
    res.end('Error\n')
  }
}

export default (server: BaseServer): void => {
  server.http('HEAD', '/health', checkHealth)
  server.http('GET', '/health', checkHealth)
}
