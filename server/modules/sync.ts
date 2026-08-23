import { zero, zeroClean, type ZeroCleanAction } from '@logux/actions'
import type { BaseServer, ConnectContext } from '@logux/server'
import { dbReset, RETENTION, SUBPROTOCOL } from '@slowreader/api'
import { inArray, sql } from 'drizzle-orm'
import debounce from 'just-debounce-it'

import { actions, db, users } from '../db/index.ts'
import { prevUsedAt } from './auth.ts'

function cleaning(action: ZeroCleanAction): string[] {
  return 'id' in action ? [action.id] : action.ids
}

async function wasOfflineTooLong(ctx: ConnectContext): Promise<boolean> {
  let prev = prevUsedAt.get(ctx.clientId)
  if (!prev) return false
  let previous = prev.usedAt
  if (Date.now() - previous.getTime() < RETENTION) return false
  let user = await db.query.users.findFirst({
    columns: { lastActionAt: true },
    where: { id: ctx.userId }
  })
  // Nothing was written while the device was away, so it missed nothing
  return !!user?.lastActionAt && user.lastActionAt > previous
}

export default (server: BaseServer): void => {
  // A single sync message can bring many actions, but we need only one write
  let acted = new Set<string>()
  let writeLastActions = debounce(() => {
    let ids = [...acted]
    acted.clear()
    void db
      .update(users)
      .set({ lastActionAt: sql`now()` })
      .where(inArray(users.id, ids))
      /* node:coverage ignore next 3 */
      .catch((error: unknown) => {
        server.logger.error(error)
      })
  }, 50)

  server.on('report', event => {
    if (event === 'destroy') writeLastActions.flush()
  })

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
          time: meta.time,
          userId: ctx.userId
        })
        .onConflictDoNothing({ target: actions.id })
      acted.add(ctx.userId)
      writeLastActions()
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
    if (lastSynced > 0 && (await wasOfflineTooLong(ctx))) {
      return [[dbReset({}), { id: server.log.generateId(), time: Date.now() }]]
    }
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
          time: column.time
        }
      ]
    })
  })
}
