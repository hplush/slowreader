import type { BaseServer } from '@logux/server'
import { hash } from 'argon2'
import { eq } from 'drizzle-orm'

import { deletePassword, setPassword } from '../../api/password.ts'
import { db, users } from '../db/index.ts'

export default (server: BaseServer): void => {
  server.type(setPassword, {
    access(ctx, action) {
      return action.userId ? ctx.isServer : true
    },
    async process(ctx, action) {
      await db
        .update(users)
        .set({ passwordHash: await hash(action.password) })
        .where(eq(users.id, action.userId ?? ctx.userId))
    }
  })
  server.type(deletePassword, {
    access() {
      return true
    },
    async process(ctx) {
      await db
        .update(users)
        .set({ passwordHash: null })
        .where(eq(users.id, ctx.userId))
    }
  })
}
