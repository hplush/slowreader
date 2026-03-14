import type { BaseServer } from '@logux/server'
import { sql } from 'drizzle-orm'

import { actionsAdded, db } from '../db/index.ts'

const NEXT_QUERY = sql.raw(`SELECT nextval('"${actionsAdded.seqName}"')`)

export default (server: BaseServer): void => {
  server.log.store.getLastAdded = async () => {
    let result = await db.execute(NEXT_QUERY)
    // Different DB drivers return different format
    let rows = Array.isArray(result)
      ? (result as { nextval: number }[]) // pglite
      : (result as { rows: { nextval: string }[] }).rows // postgres.js
    return Number(rows[0]!.nextval)
  }
}
