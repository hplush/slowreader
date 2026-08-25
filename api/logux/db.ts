import { defineAction } from './utils.ts'

/**
 * How long we keep tombstones. Clients connecting after this period will be
 * forced by the server to reset database.
 */
export const RETENTION = 30 * 24 * 60 * 60 * 1000

export interface DbResetAction {
  type: 'db/reset'
}

export const dbReset = defineAction<DbResetAction>('db/reset')
