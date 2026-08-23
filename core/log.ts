// Tables are the source of truth, so the log keeps only what can not be
// restored from them: unsent actions, tombstones of deleted rows and shadows
// of the actions, which still own a cell on the server.

import {
  type CrdtTableChangedAction,
  type CrdtTableCreatedAction,
  type CrdtTableDeletedAction,
  loguxProcessed,
  shadow,
  zeroClean
} from '@logux/actions'
import {
  type ClientMeta,
  type CrossTabClient,
  replaceWithShadow
} from '@logux/client'
import type { CrdtWonCell } from '@logux/client/db'
import {
  type Action,
  isFirstOlder,
  isSameClient,
  type Meta,
  type MetaTime
} from '@logux/core'
import type { Database } from '@nanostores/sql'
import { RETENTION } from '@slowreader/api'
import debounce from 'just-debounce-it'

import { getEnvironment } from './environment.ts'
import { createReasonChanges } from './lib/reasons.ts'
import { createTaskQueue } from './lib/tasks.ts'
import { hasPassword } from './settings.ts'

type TableAction =
  | CrdtTableChangedAction
  | CrdtTableCreatedAction
  | CrdtTableDeletedAction

type Verb = 'changed' | 'created' | 'deleted'

export interface LogTracker {
  applied(
    tx: Database,
    action: Action,
    meta: MetaTime,
    won: CrdtWonCell[]
  ): void
  destroy(): void
  finish(): Promise<void>
  resume(ready: Promise<void>): void
}

/**
 * Rows, which the action touched, with the fields it wrote to every row.
 */
function rowsOf(action: TableAction): [string, string[]][] {
  if ('records' in action) {
    return action.records.map(record => [
      record.id,
      Object.keys(record).filter(field => field !== 'id')
    ])
  }
  let fields = 'fields' in action ? Object.keys(action.fields) : []
  let ids = 'ids' in action ? action.ids : [action.id]
  return ids.map(id => [id, fields])
}

/**
 * The database is closed on sign out in the middle of the task. The report
 * is delayed to not break the queue by the throwing warning of tests.
 */
/* node:coverage disable */
function reportTaskError(error: unknown): void {
  setTimeout(() => {
    getEnvironment().warn(error)
  })
}
/* node:coverage enable */

/**
 * Table name and verb of the action, which passed `isTableAction()`.
 */
function splitType(action: TableAction): [string, Verb] {
  let slash = action.type.lastIndexOf('/')
  return [action.type.slice(0, slash), action.type.slice(slash + 1) as Verb]
}

/**
 * Track the log to keep in it only actions, which are not derivable
 * from the tables.
 *
 * @param logux Logux client.
 * @param plurals Names of all CRDT tables of the database.
 */
export function trackLog(logux: CrossTabClient, plurals: string[]): LogTracker {
  let tables = new Set(plurals)
  // The client is re-created on every `hasPassword` change, so the mode
  // can not change during the tracker’s life
  let cloud = hasPassword.get()

  function isTableAction(action: Action): action is TableAction {
    let slash = action.type.lastIndexOf('/')
    if (slash === -1) return false
    let verb = action.type.slice(slash + 1)
    if (verb !== 'changed' && verb !== 'created' && verb !== 'deleted') {
      return false
    }
    return tables.has(action.type.slice(0, slash))
  }

  /**
   * Reasons of the log tracking. Everything else (`syncing`,
   * `applying-to-db`) belongs to Logux and must not be moved to the shadow.
   */
  function isCellReason(reason: string): boolean {
    return reason === 'tombstone' || tables.has(reason.split('/')[0]!)
  }

  // Tracking reads the log and writes it back, so the tasks are serialized
  // to not overwrite the reasons, which another task has just removed.
  // They start on `CrdtDatabase#ready`: the migration replay opens its
  // transactions outside of the log store’s queue, so a log write during
  // the replay will wait for the transaction, which waits for the write.
  let tasks = createTaskQueue(reportTaskError)

  /**
   * IDs of the actions, which were replaced by the shadow. Their `clean`
   * event must not ask the server to remove them.
   */
  let shadowed = new Set<string>()

  /**
   * Nobody owns cells of the deleted row anymore.
   */
  async function forgetRows(plural: string, ids: string[]): Promise<void> {
    let changes = createReasonChanges()
    for (let id of ids) {
      let row = `${plural}/${id}`
      await logux.log.each({ index: row }, (action, meta) => {
        changes.keep(meta, reason => {
          return reason !== row && !reason.startsWith(`${row}/`)
        })
      })
    }
    await changes.write(logux.log)
  }

  /**
   * Previous owners of the won cells lost them, and this action lost
   * the cells, which it touched but did not win.
   */
  async function forgetCells(
    plural: string,
    ids: string[],
    won: Set<string>,
    lost: Set<string>,
    meta: MetaTime
  ): Promise<void> {
    let restored = !('reasons' in meta)
    // `isFirstOlder()` reads only `id` and `time`, but asks for the whole meta
    let applied: Meta = { added: 0, id: meta.id, reasons: [], time: meta.time }
    let changes = createReasonChanges()
    for (let id of ids) {
      await logux.log.each({ index: `${plural}/${id}` }, (action, other) => {
        // The shadow keeps the ID of the original action in its body
        let self =
          other.id === meta.id ||
          (shadow.match(action) && action.id === meta.id)
        if (!self) {
          if (isFirstOlder(other, applied)) {
            changes.keep(other, reason => !won.has(reason))
          }
        } else if (restored) {
          // The action was restored from the tables, so its shadow could
          // lose the reasons of the cells, which it still owns
          changes.add(other, [...won])
        } else {
          changes.keep(other, reason => !lost.has(reason))
        }
      })
    }
    await changes.write(logux.log)
  }

  /**
   * The server re-sends the actions, which the client did not confirm as
   * received, and the shadow can not be recognized as their copy
   * by the action itself, so every shadow is indexed by the original ID.
   */
  async function findShadow(id: string): Promise<ClientMeta | undefined> {
    let found: ClientMeta | undefined
    await logux.log.each({ index: id }, (action, meta) => {
      found = meta
      return false
    })
    return found
  }

  /**
   * The body of the applied action duplicates the tables, so replace it
   * with the shadow, which keeps only the ID, the reasons, the indexes
   * and the time.
   */
  async function shadowAction(id: string): Promise<void> {
    let [action, meta] = await logux.log.byId(id)
    if (!action || !meta || !isTableAction(action)) return
    let reasons = meta.reasons.filter(isCellReason)
    // The action, which lost last write wins for every field, owns nothing,
    // so the `clean` event will ask the server to remove it
    if (reasons.length === 0) {
      await logux.log.changeMeta(id, { reasons: [] })
      return
    }
    shadowed.add(id)
    let previous = await findShadow(id)
    if (previous) {
      // The re-sent action could win the cells back from its own shadow
      let merged = previous.reasons.concat(
        reasons.filter(reason => !previous.reasons.includes(reason))
      )
      await logux.log.changeMeta(previous.id, { reasons: merged })
      await logux.log.changeMeta(id, { reasons: [] })
    } else {
      await replaceWithShadow(logux, {
        ...meta,
        indexes: [...(meta.indexes ?? []), id],
        reasons
      })
    }
  }

  /**
   * Cleaning is batched: marking a page of posts as read cleans
   * hundreds of actions at once.
   */
  let cleaning = new Set<string>()
  let cleanOnServer = debounce(() => {
    let ids = [...cleaning]
    cleaning.clear()
    tasks.add(async () => {
      await logux.log.add(zeroClean({ ids }), { sync: true })
    })
  }, 1)

  let unbindPreadd = logux.on('preadd', (action, meta) => {
    if (!isTableAction(action)) return
    // Tables add every action with `sync`, but the local user has no server
    if (!cloud) {
      meta.sync = false
      meta.reasons = meta.reasons.filter(reason => reason !== 'syncing')
      return
    }
    meta.sync = isSameClient(meta.id, logux.clientId)
    let [plural, verb] = splitType(action)
    let rows = rowsOf(action)
    if (rows.length === 0) return
    if (verb === 'deleted') {
      meta.indexes = ['tombstone']
      meta.reasons.push('tombstone')
    } else {
      for (let [id, fields] of rows) {
        for (let field of fields) meta.reasons.push(`${plural}/${id}/${field}`)
        // Without it the create is cleaned as soon as every its cell was
        // overwritten and a new device will get only `*/changed` actions
        if (verb === 'created') meta.reasons.push(`${plural}/${id}`)
      }
      meta.indexes = [plural, ...rows.map(row => `${plural}/${row[0]}`)]
    }
  })

  let unbindClean = logux.on('clean', (action, meta) => {
    if (!cloud) return
    if (shadow.match(action)) {
      cleaning.add(action.id)
    } else if (isTableAction(action) && !shadowed.delete(meta.id)) {
      cleaning.add(meta.id)
    } else {
      return
    }
    cleanOnServer()
  })

  let unbindProcessed = logux.type(loguxProcessed, action => {
    // Unconfirmed action is our outbox copy and may be re-sent,
    // so own actions become shadows only after the server confirmation
    tasks.add(() => shadowAction(action.id))
  })

  /**
   * Deletion is the only action without a row, so somebody must delete it
   * by a timer. Any device can do it: `0/clean` checks the user,
   * not the author.
   */
  async function expireTombstones(): Promise<void> {
    let expired: string[] = []
    let oldest = Date.now() - RETENTION
    await logux.log.each({ index: 'tombstone' }, (action, meta) => {
      if (meta.time < oldest) expired.push(meta.id)
    })
    for (let id of expired) {
      await logux.log.removeReason('tombstone', { id })
    }
  }

  /**
   * The shadow and the removal of the original are two writes, so the tab,
   * which was closed between them, leaves the body in the log.
   */
  async function repairLog(): Promise<void> {
    let shadows = new Set<string>()
    let originals: string[] = []
    await logux.log.each({ order: 'added' }, (action, meta) => {
      if (shadow.match(action)) {
        shadows.add(action.id)
      } else if (isTableAction(action)) {
        originals.push(meta.id)
      }
    })
    for (let id of originals) {
      if (!shadows.has(id)) continue
      shadowed.add(id)
      await logux.log.changeMeta(id, { reasons: [] })
    }
    await expireTombstones()
  }

  if (cloud) tasks.add(repairLog)
  let unbindState = logux.on('state', () => {
    if (cloud && logux.state === 'synchronized') tasks.add(expireTombstones)
  })

  return {
    applied(tx, action, meta, won) {
      if (!cloud || !isTableAction(action)) return
      let [plural, verb] = splitType(action)
      let rows = rowsOf(action)
      if (rows.length === 0) return
      let ids = rows.map(row => row[0])
      if (verb === 'deleted') {
        tasks.add(() => forgetRows(plural, ids))
      } else {
        let winners = new Set(won.map(cell => cell.join('/')))
        let losers = new Set<string>()
        for (let [id, fields] of rows) {
          for (let field of fields) {
            let cell = `${plural}/${id}/${field}`
            if (!winners.has(cell)) losers.add(cell)
          }
        }
        tasks.add(() => forgetCells(plural, ids, winners, losers, meta))
      }
      // The action of another device is already on the server and will never
      // be re-sent, so there is nothing to wait for
      if ('reasons' in meta && !isSameClient(meta.id, logux.clientId)) {
        tasks.add(() => shadowAction(meta.id))
      }
    },
    destroy() {
      cleanOnServer.cancel()
      unbindPreadd()
      unbindClean()
      unbindProcessed()
      unbindState()
      tasks.destroy()
    },
    finish() {
      return tasks.finish()
    },
    resume(ready) {
      void ready.then(tasks.start)
    }
  }
}
