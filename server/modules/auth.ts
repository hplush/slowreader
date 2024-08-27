import type { BaseServer } from '@logux/server'
import { and, eq, sql } from 'drizzle-orm'

import { db, sessions } from '../db.ts'

export default (server: BaseServer): void => {
  server.auth(async ({ cookie, token, userId }) => {
    let sessionToken = token || cookie.session
    if (!sessionToken) return false
    let session = await db.query.sessions.findFirst({
      columns: { id: true },
      where: and(eq(sessions.token, sessionToken), eq(sessions.userId, userId))
    })
    if (session) {
      db.update(sessions)
        .set({ usedAt: sql`now()` })
        .where(eq(sessions.id, session.id))
        .catch(error => {
          /* c8 ignore next */
          server.logger.error(error)
        })
      return true
    } else {
      return false
    }
  })
}
