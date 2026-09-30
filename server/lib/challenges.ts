import {
  and,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lte,
  sql
} from 'drizzle-orm'
import { randomBytes } from 'node:crypto'

import { challenges, db } from '../db/index.ts'

export type ChallengeKind = (typeof challenges.$inferSelect)['type']

export class TooManyChallenges extends Error {}

function unexpired(): ReturnType<typeof gt> {
  return gt(challenges.expiresAt, sql`now()`)
}

export async function createChallenge(
  type: ChallengeKind,
  userId: null | string
): Promise<string> {
  await db.delete(challenges).where(lte(challenges.expiresAt, sql`now()`))
  if (userId) {
    let [own] = await db
      .select({ value: count() })
      .from(challenges)
      .where(and(eq(challenges.userId, userId), unexpired()))
    if (own!.value >= 5) throw new TooManyChallenges()
  }
  let challenge = randomBytes(32).toString('base64url')
  await db.insert(challenges).values({
    challenge,
    expiresAt: sql`now() + interval '5 minutes'`,
    type,
    userId
  })
  if (!userId) {
    // Blocking new challenges on overflow would let an attacker with many IPs
    // break sign-in for everyone
    await db
      .delete(challenges)
      .where(
        inArray(
          challenges.id,
          db
            .select({ id: challenges.id })
            .from(challenges)
            .where(isNull(challenges.userId))
            .orderBy(desc(challenges.id))
            .offset(10000)
        )
      )
  }
  return challenge
}

/**
 * Single SQL request, so only one of concurrent requests with the same
 * response can get the challenge.
 */
export async function consumeChallenge(
  challenge: string,
  type: ChallengeKind,
  userId: null | string
): Promise<boolean> {
  let deleted = await db
    .delete(challenges)
    .where(
      and(
        eq(challenges.challenge, challenge),
        eq(challenges.type, type),
        userId ? eq(challenges.userId, userId) : isNull(challenges.userId),
        unexpired()
      )
    )
    .returning({ id: challenges.id })
  return deleted.length > 0
}
