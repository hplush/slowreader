import type { BaseServer } from '@logux/server'
import { deleteUser } from '@slowreader/api'
import { eq } from 'drizzle-orm'

import { actions, db, sessions, users } from '../db/index.ts'

async function deleteUserData(
  server: BaseServer,
  userId: string
): Promise<void> {
  await db.transaction(async tx => {
    await Promise.all([
      tx.delete(sessions).where(eq(sessions.userId, userId)),
      tx.delete(actions).where(eq(actions.userId, userId))
    ])
    await tx.delete(users).where(eq(users.id, userId))
  })
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
      deleteUserData(server, ctx.userId).catch((e: unknown) => {
        /* c8 ignore next */
        throw e
      })
    }
  })
}
