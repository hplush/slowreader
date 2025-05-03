import type { BaseServer } from '@logux/server'
import { sql } from 'drizzle-orm'

import { actionsAdded, db } from '../db/index.ts'

const NEXT_QUERY = sql.raw(`SELECT nextval('"${actionsAdded.seqName}"')`)

export default (server: BaseServer): void => {
  server.log.store.getLastAdded = async () => {
    let result = (await db.execute(NEXT_QUERY)) as {
      rows: [{ nextval: number }]
    }
    return result.rows[0].nextval
  }
}
