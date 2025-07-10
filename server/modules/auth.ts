import type { BaseServer } from '@logux/server'
import {
  setPassword,
  signInEndpoint,
  signOutEndpoint,
  signUpEndpoint
} from '@slowreader/api'
import { verify } from 'argon2'
import cookieJs from 'cookie'
import { and, eq, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import type { ServerResponse } from 'node:http'

import { db, sessions, users } from '../db/index.ts'
import { ErrorResponse, jsonApi } from '../lib/http.ts'

async function setNewSession(
  res: ServerResponse,
  userId: string
): Promise<string> {
  let token = nanoid()
  await db.insert(sessions).values({ token, usedAt: sql`now()`, userId })
  res.setHeader('Set-Cookie', `session=${token}; HttpOnly; Path=/; Secure`)
  return token
}

export default (server: BaseServer): void => {
  server.auth(async ({ client, cookie, token, userId }) => {
    let sessionToken = token || cookie.session
    if (!sessionToken) return false
    let session = await db.query.sessions.findFirst({
      columns: { id: true },
      where: and(eq(sessions.token, sessionToken), eq(sessions.userId, userId))
    })
    if (session) {
      await db
        .update(sessions)
        .set({ clientId: client.clientId, usedAt: sql`now()` })
        .where(eq(sessions.id, session.id))
        .catch((error: unknown) => {
          /* c8 ignore next */
          server.logger.error(error)
        })
      return true
    } else {
      return false
    }
  })

  jsonApi(server, signInEndpoint, async (params, res) => {
    let user = await db.query.users.findFirst({
      where: eq(users.id, params.userId)
    })
    if (user?.passwordHash) {
      if (await verify(user.passwordHash, params.password)) {
        let token = await setNewSession(res, params.userId)
        return { session: token }
      }
    }
    return new ErrorResponse('Invalid credentials')
  })

  jsonApi(server, signOutEndpoint, async (params, res, req) => {
    let token = params.session
    if (!token) {
      token = cookieJs.parse(req.headers.cookie ?? '').session
      res.setHeader(
        'Set-Cookie',
        'session=; Max-Age=0; HttpOnly; Path=/; Secure'
      )
    }
    if (!token) return false

    let session = await db.query.sessions.findFirst({
      where: eq(sessions.token, token)
    })
    if (session) {
      for (let client of server.connected.values()) {
        if (client.clientId === session.clientId) client.destroy()
      }
      await db.delete(sessions).where(eq(sessions.token, token))
    }
    return {}
  })

  jsonApi(server, signUpEndpoint, async (params, res) => {
    let userId = params.userId

    let already: object | undefined
    await db.transaction(async tx => {
      already = await tx.query.users.findFirst({ where: eq(users.id, userId) })
      if (!already) await tx.insert(users).values({ id: userId })
    })
    if (already) return new ErrorResponse('User ID was already taken')

    await server.process(setPassword({ password: params.password, userId }))
    let session = await setNewSession(res, userId)
    return { session, userId }
  })
}
