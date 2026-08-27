import type { TestClient, TestServer } from '@logux/server'
import type { Requester } from '@slowreader/api'
import { equal } from 'node:assert'
import { deepEqual } from 'node:assert/strict'
import { setTimeout } from 'node:timers/promises'

export { buildTestServer, cleanAllTables, getServerLogIds } from '../test.ts'

export async function testRequest<
  Params extends Record<string, unknown>,
  ResponseJSON
>(
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
export async function waitForActions(
  client: TestClient,
  expected: object[]
): Promise<void> {
  for (
    let i = 0;
    i < 1000 && client.log.actions().length < expected.length;
    i++
  ) {
    await setTimeout(10)
  }
  deepEqual(client.log.actions(), expected)
}
