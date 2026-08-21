import { zero, zeroClean, type ZeroCleanAction } from '@logux/actions'
import type { BaseServer } from '@logux/server'
import { SUBPROTOCOL } from '@slowreader/api'
import { inArray } from 'drizzle-orm'

import { actions, db } from '../db/index.ts'

const EPOCH = Date.UTC(2026, 0)

function cleaning(action: ZeroCleanAction): string[] {
  return 'id' in action ? [action.id] : action.ids
}

export default (server: BaseServer): void => {
  server.type(zero, {
    access() {
      return true
    },
    async process(ctx, action, meta) {
      // The client re-sends actions which were not confirmed before
      // the reconnect, and the server could already save some of them.
      // The action with the same ID always has the same content.
      await db
        .insert(actions)
        .values({
          added: await server.log.store.getLastAdded(),
          compressed: action.compressed,
          encrypted: Buffer.from(action.d),
          id: meta.id,
          iv: Buffer.from(action.iv),
          subprotocol: meta.subprotocol ?? SUBPROTOCOL,
          time: meta.time - EPOCH,
          userId: ctx.userId
        })
        .onConflictDoNothing({ target: actions.id })
    },
    resend(ctx) {
      return { user: ctx.userId }
    }
  })

  server.type(zeroClean, {
    async access(ctx, action) {
      let deleting = await db.query.actions.findMany({
        where: { id: { in: cleaning(action) } }
      })
      return deleting.every(i => i.userId === ctx.userId)
    },
    async process(ctx, action) {
      await db.delete(actions).where(inArray(actions.id, cleaning(action)))
    },
    resend(ctx) {
      return { user: ctx.userId }
    }
  })

  server.sendOnConnect(async (ctx, lastSynced) => {
    let list = await db.query.actions.findMany({
      where: { added: { gt: lastSynced }, userId: ctx.userId }
    })
    return list.map(column => {
      return [
        zero({
          compressed: column.compressed,
          d: column.encrypted,
          iv: column.iv
        }),
        {
          added: column.added,
          id: column.id,
          subprotocol: column.subprotocol,
          time: column.time + EPOCH
        }
      ]
    })
  })
}
