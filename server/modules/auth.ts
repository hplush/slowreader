import {
  passkeyChallengeEndpoint,
  type ChallengeType,
  newPasswordEndpoint,
  passwordLockedKeyEndpoint,
  type Proof,
  REAUTH_ERRORS,
  SIGN_IN_ERRORS,
  SIGN_UP_ERRORS,
  signInEndpoint,
  signOutEndpoint,
  signUpEndpoint
} from '@slowreader/api'
import { hash } from 'argon2'
import { parseCookie } from 'cookie'
import { eq, sql } from 'drizzle-orm'
import type { IncomingMessage } from 'node:http'

import { getProvider } from '../aaguids/utils.ts'
import { db, passkeys, sessions, users } from '../db/index.ts'
import {
  createChallenge,
  type ChallengeKind,
  TooManyChallenges
} from '../lib/challenges.ts'
import { config } from '../lib/config.ts'
import { getDevice } from '../lib/device.ts'
import { ErrorResponse, jsonApi, tooManyRequests } from '../lib/http.ts'
import {
  anonymousChallenges,
  countFailure,
  requestIp,
  tooManyFailures
} from '../lib/limits.ts'
import {
  createSession,
  findSession,
  hashToken,
  insertSession,
  notifyCreated,
  notifyDeleted,
  setSessionCookie
} from '../lib/sessions.ts'
import type { AppServer } from '../lib/types.ts'
import {
  pickPasskeyName,
  TooManyAttempts,
  verifyAssertion,
  verifyPassword,
  verifyProof,
  verifyRegistration
} from '../lib/webauthn.ts'

const CHALLENGE_KINDS: Record<ChallengeType, ChallengeKind> = {
  add: 'registration',
  reauth: 'reauth',
  signIn: 'authentication',
  signUp: 'registration'
}

function getToken(
  req: IncomingMessage,
  params: { session?: string }
): string | undefined {
  return params.session ?? parseCookie(req.headers.cookie ?? '').session
}

async function getSessionUser(
  req: IncomingMessage,
  params: { session?: string }
): Promise<undefined | { id: string; userId: string }> {
  let token = getToken(req, params)
  if (!token) return undefined
  return findSession(token)
}

async function checkReauth(
  req: IncomingMessage,
  proof: Proof,
  session: { userId: string }
): Promise<ErrorResponse | { passkeyId: null | string }> {
  try {
    let checked = await verifyProof(proof, session.userId, requestIp(req))
    return checked || new ErrorResponse(REAUTH_ERRORS.wrongProof)
  } catch (e) {
    if (e instanceof TooManyAttempts) return tooManyRequests()
    /* node:coverage ignore next 2 */
    throw e
  }
}

export default (server: AppServer): void => {
  server.auth(async ({ client, cookie, token, userId }) => {
    let sessionToken = token || cookie.session
    if (!sessionToken) return false
    let session = await db.query.sessions.findFirst({
      columns: { id: true, usedAt: true },
      where: { tokenHash: hashToken(sessionToken), userId }
    })
    if (!session) return false
    client.data.sessionId = session.id
    client.data.usedAt = session.usedAt
    // Revocation between the read and sessionId set could miss this client
    let updated = await db
      .update(sessions)
      .set({ usedAt: sql`now()` })
      .where(eq(sessions.id, session.id))
      .returning({ id: sessions.id })
    return updated.length > 0
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

  jsonApi(server, passkeyChallengeEndpoint, async (params, res, req) => {
    let userId: null | string = null
    if (params.type === 'add' || params.type === 'reauth') {
      let session = await getSessionUser(req, params)
      if (!session) return false
      userId = session.userId
    } else {
      let ip = requestIp(req)
      if (anonymousChallenges.isOver(ip)) return tooManyRequests()
      anonymousChallenges.add(ip)
    }
    try {
      let challenge = await createChallenge(
        CHALLENGE_KINDS[params.type],
        userId
      )
      let credentials = userId
        ? await db
            .select({ id: passkeys.id, transports: passkeys.transports })
            .from(passkeys)
            .where(eq(passkeys.userId, userId))
        : []
      return {
        challenge,
        credentials,
        rpId: new URL(config.webOrigin).hostname
      }
    } catch (e) {
      if (e instanceof TooManyChallenges) return tooManyRequests()
      /* node:coverage ignore next 2 */
      throw e
    }
  })

  jsonApi(server, signInEndpoint, async (params, res, req) => {
    let ip = requestIp(req)
    if ('password' in params) {
      if (tooManyFailures(params.userId, ip)) return tooManyRequests()
      let checked = await verifyPassword(params.userId, params.password.authKey)
      if (!checked) {
        countFailure(params.userId, ip)
        return new ErrorResponse(SIGN_IN_ERRORS.invalidCredentials)
      }
      let token = await createSession(server, res, {
        device: getDevice(req.headers['user-agent']),
        passkeyId: null,
        userId: params.userId
      })
      return {
        hasPassword: true,
        lockedKey: checked.lockedKey,
        session: token,
        userId: params.userId
      }
    }
    if (tooManyFailures(undefined, ip)) return tooManyRequests()
    let result = await verifyAssertion(params.passkey, 'authentication', null)
    if (!result.valid) {
      countFailure(undefined, ip)
      if (result.unknown) {
        return new ErrorResponse(SIGN_IN_ERRORS.unknownPasskey)
      } else {
        return new ErrorResponse(SIGN_IN_ERRORS.invalidCredentials)
      }
    }
    if (tooManyFailures(result.passkey.userId, ip)) return tooManyRequests()
    let user = await db.query.users.findFirst({
      columns: { passwordHash: true },
      where: { id: result.passkey.userId }
    })
    let token = await createSession(server, res, {
      device: getDevice(req.headers['user-agent']),
      passkeyId: result.passkey.id,
      userId: result.passkey.userId
    })
    return {
      hasPassword: !!user?.passwordHash,
      lockedKey: result.passkey.lockedKey,
      session: token,
      userId: result.passkey.userId
    }
  })

  jsonApi(server, signOutEndpoint, async (params, res, req) => {
    let token = params.session
    if (!token) {
      token = parseCookie(req.headers.cookie ?? '').session
      setSessionCookie(res, '')
    }
    if (!token) return false

    let [deleted] = await db
      .delete(sessions)
      .where(eq(sessions.tokenHash, hashToken(token)))
      .returning({ id: sessions.id, userId: sessions.userId })
    if (deleted) await notifyDeleted(server, deleted.userId, [deleted.id])
    return {}
  })

  jsonApi(server, signUpEndpoint, async (params, res, req) => {
    let userId = params.userId

    let passkey = params.passkey
      ? await verifyRegistration(params.passkey.response, null)
      : undefined
    if (passkey === false) {
      return new ErrorResponse(SIGN_UP_ERRORS.invalidPasskey)
    }

    let password = 'password' in params ? params.password : undefined
    let passwordHash = password ? await hash(password.authKey) : null
    let provider = passkey ? getProvider(passkey.aaguid) : null
    let created = await db.transaction(async tx => {
      let already = await tx.query.users.findFirst({ where: { id: userId } })
      if (already) return undefined
      await tx.insert(users).values({
        id: userId,
        passwordHash,
        passwordLockedKey: password?.lockedKey ?? null
      })
      if (passkey && params.passkey) {
        await tx.insert(passkeys).values({
          ...passkey,
          lockedKey: params.passkey.lockedKey,
          name: pickPasskeyName(provider, []),
          userId
        })
      }
      return insertSession(tx, {
        device: getDevice(req.headers['user-agent']),
        passkeyId: passkey ? passkey.id : null,
        userId
      })
    })
    if (!created) return new ErrorResponse(SIGN_UP_ERRORS.userIdTaken)
    setSessionCookie(res, created.token)
    await notifyCreated(server, userId, created.id)
    if (passkey) {
      return {
        passkey: { provider, synced: passkey.synced },
        session: created.token,
        userId
      }
    } else {
      return { session: created.token, userId }
    }
  })

  jsonApi(server, passwordLockedKeyEndpoint, async (params, _, req) => {
    let current = await getSessionUser(req, params)
    if (!current) return false
    let proof = await checkReauth(req, { authKey: params.authKey }, current)
    if (proof instanceof ErrorResponse) return proof
    let user = await db.query.users.findFirst({
      columns: { passwordLockedKey: true },
      where: { id: current.userId }
    })
    return { lockedKey: user!.passwordLockedKey! }
  })

  jsonApi(server, newPasswordEndpoint, async (params, res, req) => {
    let current = await getSessionUser(req, params)
    if (!current) return false
    let userId = current.userId
    let proof = await checkReauth(req, params.proof, current)
    if (proof instanceof ErrorResponse) return proof

    let passwordHash = await hash(params.authKey)
    let passkeyId = proof.passkeyId
    let { id, old, token } = await db.transaction(async tx => {
      await tx
        .update(users)
        .set({ passwordHash, passwordLockedKey: params.lockedKey })
        .where(eq(users.id, userId))
      let deleted = await tx
        .delete(sessions)
        .where(eq(sessions.userId, userId))
        .returning({ id: sessions.id })
      let created = await insertSession(tx, {
        device: getDevice(req.headers['user-agent']),
        passkeyId,
        userId
      })
      return { ...created, old: deleted.map(i => i.id) }
    })
    setSessionCookie(res, token)
    await notifyDeleted(server, userId, old)
    await notifyCreated(server, userId, id)
    return { session: token }
  })
}
