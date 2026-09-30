import type { ServerClient } from '@logux/server'
import {
  changedSessionAction,
  createdSessionAction,
  deletedSessionAction,
  deleteOtherSessions,
  deleteSessionAction,
  isDeleteOtherSessionsAction,
  isDeleteSessionAction,
  loadedSessionsAction
} from '@slowreader/api'
import { and, eq, ne } from 'drizzle-orm'

import { db, sessions } from '../db/index.ts'
import {
  deleteSessions,
  isSessionOnline,
  toSessionValue
} from '../lib/sessions.ts'
import type { AppServer, ClientData } from '../lib/types.ts'

export default (server: AppServer): void => {
  function sendStatus(client: ServerClient<ClientData>): void {
    let id = client.data.sessionId
    if (!id) return
    server
      .process(
        changedSessionAction({
          id,
          online: isSessionOnline(server, id),
          usedAt: Date.now(),
          userId: client.userId!
        })
      )
      /* node:coverage ignore next 3 */
      .catch((error: unknown) => {
        server.logger.error(error)
      })
  }

  server.on('authenticated', sendStatus)
  server.on('disconnected', sendStatus)

  server.channel<{ id: string }>('users/:id/sessions', {
    access(ctx) {
      return ctx.params.id === ctx.userId
    },
    async load(ctx) {
      let rows = await db.query.sessions.findMany({
        where: { userId: ctx.userId }
      })
      return loadedSessionsAction({
        current: server.clientIds.get(ctx.clientId)?.data.sessionId ?? null,
        sessions: rows.map(row => toSessionValue(server, row))
      })
    }
  })

  server.type(loadedSessionsAction, {
    access() {
      return false
    }
  })

  server.type(createdSessionAction, {
    access() {
      return false
    },
    resend(ctx, action) {
      return { channels: [`users/${action.userId}/sessions`] }
    }
  })

  server.type(changedSessionAction, {
    access() {
      return false
    },
    resend(ctx, action) {
      return { channels: [`users/${action.userId}/sessions`] }
    }
  })

  server.type(deletedSessionAction, {
    access() {
      return false
    },
    resend(ctx, action) {
      return { channels: [`users/${action.userId}/sessions`] }
    }
  })

  server.type(deleteSessionAction, {
    async access(ctx, action) {
      if (!isDeleteSessionAction(action)) return false
      let session = await db.query.sessions.findFirst({
        columns: { id: true },
        where: { id: action.id, userId: ctx.userId }
      })
      return !!session
    },
    async process(ctx, action) {
      await deleteSessions(server, ctx.userId, [action.id])
    }
  })

  server.type(deleteOtherSessions, {
    access(ctx, action) {
      return isDeleteOtherSessionsAction(action)
    },
    async process(ctx) {
      let current = server.clientIds.get(ctx.clientId)?.data.sessionId ?? ''
      let others = await db
        .select({ id: sessions.id })
        .from(sessions)
        .where(and(eq(sessions.userId, ctx.userId), ne(sessions.id, current)))
      await deleteSessions(
        server,
        ctx.userId,
        others.map(i => i.id)
      )
    }
  })
}
