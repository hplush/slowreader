import { zero, zeroClean, type ZeroCleanAction } from '@logux/actions'
import { parseId } from '@logux/core'
import type { ServerClient } from '@logux/server'
import { dbReset, RETENTION } from '@slowreader/api'
import { inArray, sql } from 'drizzle-orm'
import debounce from 'just-debounce-it'

import { db, users } from '../db/index.ts'
import type { AppServer, ClientData } from '../lib/types.ts'

function ids(action: ZeroCleanAction): string[] {
  return 'id' in action ? [action.id] : action.ids
}

async function wasOfflineTooLong(
  client: ServerClient<ClientData>
): Promise<boolean> {
  let previous = client.data.usedAt
  if (!previous) return false
  if (Date.now() - previous.getTime() < RETENTION) return false
  let user = await db.query.users.findFirst({
    columns: { lastActionAt: true },
    where: { id: client.userId }
  })
  // Nothing was written while the device was away, so it missed nothing
  return !!user?.lastActionAt && user.lastActionAt > previous
}

export default (server: AppServer): void => {
  // A single sync message can bring many actions, but we need only one write
  let acted = new Set<string>()
  let writeLastActions = debounce(() => {
    let list = [...acted]
    acted.clear()
    void db
      .update(users)
      .set({ lastActionAt: sql`now()` })
      .where(inArray(users.id, list))
      /* node:coverage ignore next 3 */
      .catch((error: unknown) => {
        server.logger.error(error)
      })
  }, 50)

  server.on('report', event => {
    if (event === 'destroy') writeLastActions.flush()
  })

  // The log keeps the action for the other devices of the user until
  // `0/clean` will say that nobody needs it anymore. `users` is set here
  // and not by `resend()`, because the sync on the connect reads it
  // from the stored meta
  server.log.on('preadd', (action, meta) => {
    if (zero.match(action)) {
      let { userId } = parseId(meta.id)
      if (userId) {
        meta.indexes = [`users/${userId}`]
        meta.reasons.push('store')
        meta.users = [userId]
      }
    }
  })

  // The device was offline longer than the retention, so the actions,
  // which it missed, could be already cleaned from the log
  server.on('authenticated', client => {
    wasOfflineTooLong(client)
      .then(tooLong => {
        if (tooLong && client.clientId) {
          return server.log.add(dbReset({}), { clients: [client.clientId] })
        }
      })
      /* node:coverage ignore next 3 */
      .catch((error: unknown) => {
        server.logger.error(error)
      })
  })

  server.type(zero, {
    access() {
      return true
    },
    process(ctx) {
      acted.add(ctx.userId)
      writeLastActions()
    }
  })

  server.type(zeroClean, {
    access(ctx, action) {
      return ids(action).every(id => parseId(id).userId === ctx.userId)
    },
    async process(ctx, action) {
      await server.log.removeReason('store', { ids: ids(action) })
    },
    resend(ctx) {
      return { user: ctx.userId }
    }
  })
}
