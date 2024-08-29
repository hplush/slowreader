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

import { db, sessions, users } from '../db.ts'
import { jsonApi } from '../http.ts'

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
  server.auth(async ({ cookie, token, userId }) => {
    let sessionToken = token || cookie.session
    if (!sessionToken) return false
    let session = await db.query.sessions.findFirst({
      columns: { id: true },
      where: and(eq(sessions.token, sessionToken), eq(sessions.userId, userId))
    })
    if (session) {
      await db
        .update(sessions)
        .set({ usedAt: sql`now()` })
        .where(eq(sessions.id, session.id))
        .catch(error => {
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
    return false
  })

  jsonApi(server, signOutEndpoint, async (params, res, req) => {
    let session = params.session
    if (!session) {
      session = cookieJs.parse(req.headers.cookie ?? '').session
    }
    if (session) {
      res.setHeader(
        'Set-Cookie',
        'session=; Max-Age=0; HttpOnly; Path=/; Secure'
      )
      await db.delete(sessions).where(eq(sessions.token, session))
    }
    return {}
  })

  jsonApi(server, signUpEndpoint, async (params, res) => {
    let id = params.id

    let already: object | undefined
    await db.transaction(async tx => {
      already = await tx.query.users.findFirst({ where: eq(users.id, id) })
      if (!already) await tx.insert(users).values({ id })
    })
    if (already) return false

    await server.process(setPassword({ password: params.password, userId: id }))
    let session = await setNewSession(res, id)
    return { id, session }
  })
}
