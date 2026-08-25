import {
  IS_PASSWORD,
  IS_USER_ID,
  setPassword,
  SIGN_IN_ERRORS,
  SIGN_UP_ERRORS,
  signInEndpoint,
  signOutEndpoint,
  signUpEndpoint
} from '@slowreader/api'
import { verify } from 'argon2'
import { parseCookie } from 'cookie'
import { eq, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import type { ServerResponse } from 'node:http'

import { db, sessions, users } from '../db/index.ts'
import { ErrorResponse, jsonApi } from '../lib/http.ts'
import type { AppServer } from '../lib/types.ts'

function setSession(res: ServerResponse, value: string): void {
  res.setHeader(
    'Set-Cookie',
    `session=${value}; HttpOnly; Path=/; SameSite=None; Secure`
  )
}

async function setNewSession(
  res: ServerResponse,
  userId: string
): Promise<string> {
  let token = nanoid()
  await db.insert(sessions).values({ token, usedAt: sql`now()`, userId })
  setSession(res, token)
  return token
}

export default (server: AppServer): void => {
  server.auth(async ({ client, cookie, token, userId }) => {
    let sessionToken = token || cookie.session
    if (!sessionToken) return false
    let session = await db.query.sessions.findFirst({
      columns: { id: true, usedAt: true },
      where: { token: sessionToken, userId }
    })
    if (session) {
      client.data.sessionId = session.id
      client.data.usedAt = session.usedAt
      await db
        .update(sessions)
        .set({ clientId: client.clientId, usedAt: sql`now()` })
        .where(eq(sessions.id, session.id))
        /* node:coverage ignore next 3 */
        .catch((error: unknown) => {
          server.logger.error(error)
        })
      return true
    } else {
      return false
    }
  })

  server.on('disconnected', client => {
    if (!client.data.sessionId) return
    void db
      .update(sessions)
      .set({ usedAt: sql`now()` })
      .where(eq(sessions.id, client.data.sessionId))
      /* node:coverage ignore next 3 */
      .catch((error: unknown) => {
        server.logger.error(error)
      })
  })

  jsonApi(server, signInEndpoint, async (params, res) => {
    let user = await db.query.users.findFirst({
      where: { id: params.userId }
    })
    if (user?.passwordHash) {
      if (await verify(user.passwordHash, params.password)) {
        let token = await setNewSession(res, params.userId)
        return { session: token }
      }
    }
    return new ErrorResponse(SIGN_IN_ERRORS.invalidCredentials)
  })

  jsonApi(server, signOutEndpoint, async (params, res, req) => {
    let token = params.session
    if (!token) {
      token = parseCookie(req.headers.cookie ?? '').session
      setSession(res, '')
    }
    if (!token) return false

    let session = await db.query.sessions.findFirst({
      where: { token }
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
    let password = params.password

    if (!IS_USER_ID.test(userId) || !IS_PASSWORD.test(password)) return false

    let already: object | undefined
    await db.transaction(async tx => {
      already = await tx.query.users.findFirst({ where: { id: userId } })
      if (!already) await tx.insert(users).values({ id: userId })
    })
    if (already) return new ErrorResponse(SIGN_UP_ERRORS.userIdTaken)

    await server.process(setPassword({ password, userId }))
    let session = await setNewSession(res, userId)
    return { session, userId }
  })
}
