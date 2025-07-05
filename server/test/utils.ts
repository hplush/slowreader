import type { TestServer } from '@logux/server'
import type { Requester } from '@slowreader/api'
import { PgTable } from 'drizzle-orm/pg-core'
import { equal } from 'node:assert'

import { db } from '../db/index.ts'
import * as tables from '../db/schema.ts'

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

export async function cleanAllTables(): Promise<void> {
  await Promise.all(
    Object.values(tables).map(async table => {
      if (table instanceof PgTable) {
        await db.delete(table)
      }
    })
  )
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
