import { db } from '../db.ts'
import * as tables from '../db/schema.ts'

export async function cleanAllTables(): Promise<void> {
  await Promise.all(
    Object.values(tables).map(table => {
      return db.delete(table)
    })
  )
}
