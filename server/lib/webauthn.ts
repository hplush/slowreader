import {
  verifyAuthenticationResponse,
  verifyRegistrationResponse
} from '@simplewebauthn/server'
import type {
  AuthenticationResponse,
  Proof,
  RegistrationResponse
} from '@slowreader/api'
import { verify } from 'argon2'
import { and, eq } from 'drizzle-orm'

import { db, passkeys } from '../db/index.ts'
import { type ChallengeKind, consumeChallenge } from './challenges.ts'
import { config } from './config.ts'
import { countFailure, tooManyFailures } from './limits.ts'

export type Passkey = typeof passkeys.$inferSelect

export function pickPasskeyName(
  provider: null | string,
  used: string[]
): string {
  let base = provider ?? 'Passkey'
  let names = new Set(used)
  if (!names.has(base)) return base
  let index = 2
  while (names.has(`${base} ${index}`)) index += 1
  return `${base} ${index}`
}

function readChallenge(clientDataJSON: string): string | undefined {
  try {
    let data: unknown = JSON.parse(
      Buffer.from(clientDataJSON, 'base64url').toString()
    )
    if (
      typeof data === 'object' &&
      data !== null &&
      'challenge' in data &&
      typeof data.challenge === 'string'
    ) {
      return data.challenge
    }
  } catch {}
  return undefined
}

async function takeChallenge(
  clientDataJSON: string,
  type: ChallengeKind,
  userId: null | string
): Promise<string | undefined> {
  let challenge = readChallenge(clientDataJSON)
  if (!challenge) return undefined
  if (!(await consumeChallenge(challenge, type, userId))) return undefined
  return challenge
}

export interface NewPasskey {
  aaguid: string
  counter: number
  id: string
  publicKey: Buffer
  synced: boolean
  transports: string[]
}

export async function verifyRegistration(
  response: RegistrationResponse,
  userId: null | string
): Promise<false | NewPasskey> {
  let challenge = await takeChallenge(
    response.response.clientDataJSON,
    'registration',
    userId
  )
  if (!challenge) return false
  try {
    let result = await verifyRegistrationResponse({
      expectedChallenge: challenge,
      expectedOrigin: config.webOrigin,
      expectedRPID: new URL(config.webOrigin).hostname,
      requireUserVerification: true,
      response
    })
    if (!result.verified) return false
    let { aaguid, credential, credentialBackedUp } = result.registrationInfo
    return {
      aaguid,
      counter: credential.counter,
      id: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      synced: credentialBackedUp,
      transports: credential.transports ?? []
    }
  } catch {
    return false
  }
}

function userHandleOf(userId: string): string {
  return Buffer.from(userId).toString('base64url')
}

export type AssertionResult =
  | { passkey: Passkey; valid: true }
  | { unknown: boolean; valid: false }

/**
 * Check passkey sign-in or re-auth. For re-auth the passkey must belong
 * to the user, who asked for the challenge.
 */
export async function verifyAssertion(
  response: AuthenticationResponse,
  type: 'authentication' | 'reauth',
  userId: null | string
): Promise<AssertionResult> {
  let passkey = await db.query.passkeys.findFirst({
    where: userId ? { id: response.id, userId } : { id: response.id }
  })
  let handle = response.response.userHandle
  if (
    !passkey ||
    (type === 'authentication' && !handle) ||
    (handle && handle !== userHandleOf(passkey.userId))
  ) {
    return { unknown: true, valid: false }
  }
  let challenge = await takeChallenge(
    response.response.clientDataJSON,
    type,
    type === 'authentication' ? null : passkey.userId
  )
  if (!challenge) return { unknown: false, valid: false }
  try {
    let result = await verifyAuthenticationResponse({
      credential: {
        counter: passkey.counter,
        id: passkey.id,
        publicKey: new Uint8Array(passkey.publicKey),
        transports: passkey.transports
      },
      expectedChallenge: challenge,
      expectedOrigin: config.webOrigin,
      expectedRPID: new URL(config.webOrigin).hostname,
      requireUserVerification: true,
      response
    })
    if (!result.verified) return { unknown: false, valid: false }
    let { credentialBackedUp, newCounter } = result.authenticationInfo
    let [updated] = await db
      .update(passkeys)
      .set({
        counter: newCounter,
        synced: credentialBackedUp,
        usedAt: new Date()
      })
      .where(
        and(eq(passkeys.id, passkey.id), eq(passkeys.userId, passkey.userId))
      )
      .returning()
    return { passkey: updated!, valid: true }
  } catch {
    return { unknown: false, valid: false }
  }
}

export async function verifyPassword(
  userId: string,
  authKey: string
): Promise<false | { lockedKey: string }> {
  let user = await db.query.users.findFirst({ where: { id: userId } })
  if (!user?.passwordHash || !user.passwordLockedKey) return false
  if (!(await verify(user.passwordHash, authKey))) return false
  return { lockedKey: user.passwordLockedKey }
}

export class TooManyAttempts extends Error {}

/**
 * Server-verified proof, that the user has the password or a passkey,
 * to change sign-in methods. Session alone is not enough.
 *
 * Returns passkey ID for passkey proof and `null` for password.
 */
export async function verifyProof(
  proof: Proof,
  userId: string,
  ip: string
): Promise<false | { passkeyId: null | string }> {
  if (tooManyFailures(userId, ip)) throw new TooManyAttempts()
  if ('authKey' in proof) {
    if (await verifyPassword(userId, proof.authKey)) return { passkeyId: null }
  } else {
    let result = await verifyAssertion(proof.assertion, 'reauth', userId)
    if (result.valid) return { passkeyId: result.passkey.id }
  }
  countFailure(userId, ip)
  return false
}
