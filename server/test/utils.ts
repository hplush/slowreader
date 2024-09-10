import { equal } from 'node:assert'

import { db } from '../db/index.ts'
import * as tables from '../db/schema.ts'

export async function cleanAllTables(): Promise<void> {
  await Promise.all(
    Object.values(tables).map(table => {
      return db.delete(table)
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
