import type { TestServer } from '@logux/server'
import type { Requester } from '@slowreader/api'
import { equal } from 'node:assert'

export { cleanAllTables } from '../test.ts'

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
