import type { Context, ServerClient } from '@logux/server'
import type { Proof } from '@slowreader/api'
import { getClientIp } from '@slowreader/proxy'
import type { IncomingMessage } from 'node:http'

import { config } from './config.ts'
import type { AppServer } from './types.ts'
import { TooManyAttempts, verifyProof } from './webauthn.ts'

export interface Counter {
  add(key: string): void
  clear(): void
  isOver(key: string): boolean
}

// TODO: Every instance has own counters. Divide limits by the number
// of instances on scaling.
/**
 * In-memory counter for abuse limits. IP addresses live only here
 * and are never logged.
 */
export function createCounter(max: number, window: number): Counter {
  let counts = new Map<string, { count: number; start: number }>()
  function get(key: string): { count: number; start: number } | undefined {
    let entry = counts.get(key)
    if (entry && Date.now() - entry.start > window) {
      counts.delete(key)
      return undefined
    }
    return entry
  }
  return {
    add(key) {
      let entry = get(key)
      if (entry) {
        entry.count += 1
      } else {
        counts.set(key, { count: 1, start: Date.now() })
      }
    },
    clear() {
      counts.clear()
    },
    isOver(key) {
      return (get(key)?.count ?? 0) >= max
    }
  }
}

export function requestIp(req: IncomingMessage): string {
  return getClientIp(req, config.behindBalancer)
}

export function clientIp(client: ServerClient | undefined): string {
  if (!client) return ''
  return getClientIp(
    {
      headers: client.httpHeaders,
      socket: { remoteAddress: client.remoteAddress }
    },
    config.behindBalancer
  )
}

export const anonymousChallenges = createCounter(20, 60 * 1000)

const FAILED_WINDOW = 15 * 60 * 1000

export const failedByUser = createCounter(10, FAILED_WINDOW)

export const failedByIp = createCounter(10, FAILED_WINDOW)

export function tooManyFailures(
  userId: string | undefined,
  ip: string
): boolean {
  return (!!userId && failedByUser.isOver(userId)) || failedByIp.isOver(ip)
}

export function countFailure(userId: string | undefined, ip: string): void {
  if (userId) failedByUser.add(userId)
  failedByIp.add(ip)
}

/**
 * Re-auth for Logux actions. Too many attempts deny the action
 * like a wrong proof.
 */
export async function checkProof(
  server: AppServer,
  ctx: Context,
  proof: Proof
): Promise<false | { passkeyId: null | string }> {
  let ip = clientIp(server.clientIds.get(ctx.clientId))
  try {
    return await verifyProof(proof, ctx.userId, ip)
  } catch (e) {
    if (e instanceof TooManyAttempts) return false
    /* node:coverage ignore next 2 */
    throw e
  }
}

export function resetLimits(): void {
  anonymousChallenges.clear()
  failedByUser.clear()
  failedByIp.clear()
}
