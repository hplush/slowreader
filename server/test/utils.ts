import type { TestClient, TestServer } from '@logux/server'
import {
  type ChallengeType,
  type Requester,
  passkeyChallenge,
  signUp
} from '@slowreader/api'
import { equal } from 'node:assert'
import { deepEqual } from 'node:assert/strict'
import { setTimeout } from 'node:timers/promises'

import type { FakeAuthenticator } from './authenticator.ts'

export {
  buildTestServer,
  cleanAllTables,
  emptyTestServer,
  FakeAuthenticator,
  getServerLogIds
} from '../test.ts'

export const LOCKED_KEY = 'L'.repeat(80)

export const PASSKEY_LOCKED_KEY = 'P'.repeat(80)

/**
 * Base58 has no `0`, so user IDs ending with `0` get `Z` keys.
 */
export function authKey(letter: string): string {
  return letter.replace('0', 'Z').repeat(22)
}

export async function testRequest<Params extends object, ResponseJSON>(
  server: TestServer,
  requester: Requester<Params, ResponseJSON>,
  params: Params,
  responseProcessor?: (response: Response) => void
): Promise<ResponseJSON> {
  let response = await requester(params, { fetch: server.fetch })
  if (!response.ok) throw new Error(await response.text())
  if (responseProcessor) responseProcessor(response)
  return response.json()
}

export async function throws(
  cb: () => Promise<unknown>,
  msg: string
): Promise<Error | undefined> {
  let error: Error | undefined
  try {
    await cb()
  } catch (e) {
    error = e as Error
  }
  equal(error?.message, msg)
  return error
}

/**
 * Wait until the client will receive all expected actions.
 *
 * Use it instead of `setTimeout()` to not depend on the machine’s speed.
 */
/**
 * Data actions of the client without `logux/prepare`, which the server
 * sends in front of the actions on every connection.
 */
function dataActions(client: TestClient): object[] {
  return client.log.actions().filter(i => i.type !== 'logux/prepare')
}

export async function waitForActions(
  client: TestClient,
  expected: object[]
): Promise<void> {
  for (
    let i = 0;
    i < 1000 && dataActions(client).length < expected.length;
    i++
  ) {
    await setTimeout(10)
  }
  deepEqual(dataActions(client), expected)
}

export async function getChallenge(
  server: TestServer,
  type: ChallengeType,
  session?: string
): Promise<string> {
  let answer = await testRequest(
    server,
    passkeyChallenge,
    session ? { session, type } : { type }
  )
  return answer.challenge
}

export async function signUpUser(
  server: TestServer,
  userId: string,
  passkey?: FakeAuthenticator
): Promise<{ key: string; passkeyId: string | undefined; session: string }> {
  let key = authKey(userId.slice(-1))
  if (passkey) {
    let challenge = await getChallenge(server, 'signUp')
    let { response } = passkey.create({ challenge, userId })
    let answer = await testRequest(server, signUp, {
      password: { authKey: key, lockedKey: LOCKED_KEY },
      passkey: { lockedKey: PASSKEY_LOCKED_KEY, response },
      userId
    })
    return { key, passkeyId: response.id, session: answer.session }
  } else {
    let answer = await testRequest(server, signUp, {
      password: { authKey: key, lockedKey: LOCKED_KEY },
      userId
    })
    return { key, passkeyId: undefined, session: answer.session }
  }
}
