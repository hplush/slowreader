// Logux applies them to actions from the old subprotocols: from the server,
// from the log, and from the old tables on the database rebuild.
// See docs/development/migrations.md before adding a new one.

import type { ActionMigrations } from '@logux/client'
import { mapCrdtFields } from '@logux/client/db'

export const migrations: ActionMigrations = {
  // Added 2026-10-16
  1: action => {
    if (action.type !== 'posts/created' && action.type !== 'posts/changed') {
      return action
    }
    return mapCrdtFields(action, fields => {
      let result = { ...fields }
      // `media` was JSON string before JSON columns
      if (typeof fields.media === 'string') {
        result.media = JSON.parse(fields.media) as unknown
      }
      // `read` was 0 or 1 before boolean columns in SQLite
      if (typeof fields.read === 'number') result.read = fields.read === 1
      return result
    })
  },
  // Added 2026-10-19
  2: action => {
    if (action.type !== 'posts/created') return action
    return mapCrdtFields(action, fields => {
      if (fields.sortedAt !== undefined || fields.publishedAt === undefined) {
        return fields
      }
      return { ...fields, sortedAt: fields.publishedAt }
    })
  }
}
