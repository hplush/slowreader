import { deleteUser, isDeleteUserAction } from '@slowreader/api'
import { eq } from 'drizzle-orm'

import { challenges, db, sessions, users } from '../db/index.ts'
import type { AppServer } from '../lib/types.ts'

async function deleteUserData(
  server: AppServer,
  userId: string
): Promise<void> {
  await db.transaction(async tx => {
    await tx.delete(sessions).where(eq(sessions.userId, userId))
    await tx.delete(challenges).where(eq(challenges.userId, userId))
    await tx.delete(users).where(eq(users.id, userId))
  })
  await server.log.removeReason('store', { index: `users/${userId}` })
  let clients = server.userIds.get(userId)
  if (clients) {
    for (let client of clients) client.destroy()
  }
}

export default (server: AppServer): void => {
  server.type(deleteUser, {
    access(ctx, action) {
      return isDeleteUserAction(action)
    },
    process(ctx) {
      /* node:coverage ignore next 3 */
      deleteUserData(server, ctx.userId).catch((e: unknown) => {
        throw e
      })
    }
  })
}
