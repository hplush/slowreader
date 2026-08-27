import type { BaseServer } from '@logux/server'
import { deleteUser } from '@slowreader/api'
import { eq } from 'drizzle-orm'

import { db, sessions, users } from '../db/index.ts'

async function deleteUserData(
  server: BaseServer,
  userId: string
): Promise<void> {
  await db.transaction(async tx => {
    await tx.delete(sessions).where(eq(sessions.userId, userId))
    await tx.delete(users).where(eq(users.id, userId))
  })
  await server.log.removeReason('store', { index: `users/${userId}` })
  let clients = server.userIds.get(userId)
  if (clients) {
    for (let client of clients) client.destroy()
  }
}

export default (server: BaseServer): void => {
  server.type(deleteUser, {
    access() {
      return true
    },
    process(ctx) {
      /* node:coverage ignore next 3 */
      deleteUserData(server, ctx.userId).catch((e: unknown) => {
        throw e
      })
    }
  })
}
