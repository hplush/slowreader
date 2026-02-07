import { zero, zeroClean } from '@logux/actions'
import type { BaseServer } from '@logux/server'
import { SUBPROTOCOL } from '@slowreader/api'
import { and, eq, gt } from 'drizzle-orm'

import { actions, db } from '../db/index.ts'

let EPOCH = Date.UTC(2026, 0)

export default (server: BaseServer): void => {
  server.type(zero, {
    access() {
      return true
    },
    async process(ctx, action, meta) {
      await db.insert(actions).values({
        added: await server.log.store.getLastAdded(),
        compressed: action.z,
        encrypted: Buffer.from(action.d, 'base64'),
        id: meta.id,
        iv: Buffer.from(action.iv, 'base64'),
        subprotocol: meta.subprotocol ?? SUBPROTOCOL,
        time: meta.time - EPOCH,
        userId: ctx.userId
      })
    },
    resend(ctx) {
      return { user: ctx.userId }
    }
  })

  server.type(zeroClean, {
    async access(ctx, action) {
      let deleting = await db.query.actions.findFirst({
        where: eq(actions.id, action.id)
      })
      if (deleting) {
        return deleting.userId === ctx.userId
      } else {
        return true
      }
    },
    async process(ctx, action) {
      await db.delete(actions).where(eq(actions.id, action.id))
    },
    resend(ctx) {
      return { user: ctx.userId }
    }
  })

  server.sendOnConnect(async (ctx, lastSynced) => {
    let list = await db.query.actions.findMany({
      where: and(eq(actions.userId, ctx.userId), gt(actions.added, lastSynced))
    })
    return list.map(column => {
      return [
        zero({
          d: Buffer.from(column.encrypted).toString('base64'),
          iv: Buffer.from(column.iv).toString('base64'),
          z: column.compressed
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
