import {
  createdSessionAction,
  deletedSessionAction,
  type SessionValue
} from '@slowreader/api'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { createHash } from 'node:crypto'
import type { ServerResponse } from 'node:http'

import { db, sessions } from '../db/index.ts'
import type { AppServer } from './types.ts'

export type Executor = Pick<typeof db, 'delete' | 'insert' | 'update'>

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('base64url')
}

export function setSessionCookie(res: ServerResponse, value: string): void {
  let age = value ? 10 * 365 * 24 * 60 * 60 : 0
  res.setHeader(
    'Set-Cookie',
    `session=${value}; HttpOnly; Path=/; SameSite=None; Secure; Max-Age=${age}`
  )
}

export function findSession(
  token: string
): Promise<typeof sessions.$inferSelect | undefined> {
  return db.query.sessions.findFirst({
    where: { tokenHash: hashToken(token) }
  })
}

// TODO: Sees only clients of this instance. Share online sessions between
// instances before scaling.
export function isSessionOnline(server: AppServer, id: string): boolean {
  for (let client of server.connected.values()) {
    if (client.data.sessionId === id) return true
  }
  return false
}

export function toSessionValue(
  server: AppServer,
  row: typeof sessions.$inferSelect
): SessionValue {
  return {
    createdAt: row.createdAt.getTime(),
    device: row.device,
    id: row.id,
    online: isSessionOnline(server, row.id),
    passkeyId: row.passkeyId,
    usedAt: row.usedAt.getTime()
  }
}

// TODO: Clients of other instances stay connected with revoked session until
// reconnect. Broadcast revocation to all instances before scaling.
export function disconnectSessions(server: AppServer, ids: string[]): void {
  let revoked = new Set(ids)
  for (let client of server.connected.values()) {
    if (revoked.has(client.data.sessionId)) client.destroy()
  }
}

export async function notifyDeleted(
  server: AppServer,
  userId: string,
  ids: string[]
): Promise<void> {
  disconnectSessions(server, ids)
  await Promise.all(
    ids.map(id => server.process(deletedSessionAction({ id, userId })))
  )
}

export async function notifyCreated(
  server: AppServer,
  userId: string,
  id: string
): Promise<void> {
  let row = await db.query.sessions.findFirst({ where: { id, userId } })
  if (!row) return
  await server.process(
    createdSessionAction({ ...toSessionValue(server, row), userId })
  )
}

export async function deleteSessions(
  server: AppServer,
  userId: string,
  ids: string[]
): Promise<void> {
  if (ids.length === 0) return
  let deleted = await db
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), inArray(sessions.id, ids)))
    .returning({ id: sessions.id })
  await notifyDeleted(
    server,
    userId,
    deleted.map(i => i.id)
  )
}

async function removeOverLimit(
  server: AppServer,
  userId: string
): Promise<void> {
  let old = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.usedAt))
    .offset(99)
  await deleteSessions(
    server,
    userId,
    old.map(i => i.id)
  )
}

export interface NewSession {
  device: string
  passkeyId: null | string
  userId: string
}

/**
 * Insert session without notifications to use it inside transactions.
 * Call `notifyCreated()` after the commit.
 */
export async function insertSession(
  tx: Executor,
  session: NewSession
): Promise<{ id: string; token: string }> {
  let token = nanoid()
  let id = nanoid()
  await tx
    .insert(sessions)
    .values({ ...session, id, tokenHash: hashToken(token) })
  return { id, token }
}

export async function createSession(
  server: AppServer,
  res: ServerResponse,
  session: NewSession
): Promise<string> {
  await removeOverLimit(server, session.userId)
  let { id, token } = await insertSession(db, session)
  setSessionCookie(res, token)
  await notifyCreated(server, session.userId, id)
  return token
}
