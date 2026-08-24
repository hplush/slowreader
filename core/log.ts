// Tables are the source of truth, so the log keeps only what can not be
// restored from them: unsent actions, tombstones of deleted rows and shadows
// of the actions, which still own a cell on the server.

import { loguxProcessed, shadow, zeroClean } from '@logux/actions'
import {
  type ClientMeta,
  type CrossTabClient,
  replaceWithShadow
} from '@logux/client'
import {
  type CrdtCell,
  type CrdtDatabase,
  createCrdtTasks,
  parseCrdtAction,
  parseCrdtRows,
  parseCrdtType
} from '@logux/client/db'
import type { Meta, MetaTime } from '@logux/core'
import { RETENTION } from '@slowreader/api'
import debounce from 'just-debounce-it'

import { getEnvironment } from './environment.ts'

export interface LogTracker {
  destroy(): void
  finish(): Promise<void>
}

function toReasons(cells: CrdtCell[]): string[] {
  return cells.map(cell => cell.join('/'))
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
 * Track the log to keep in it only actions, which are not derivable
 * from the tables. It is used only by the cloud user: the local log
 * is empty, since the local actions are never sent anywhere.
 *
 * @param logux Logux client.
 * @param crdt CRDT database with all the tables.
 */
export function trackLog(
  logux: CrossTabClient,
  crdt: CrdtDatabase
): LogTracker {
  // Tracking reads the log and writes it back, so the tasks are serialized
  // to not overwrite the reasons, which another task has just removed.
  // They start on `CrdtDatabase#ready`: the migration replay opens its
  // transactions outside of the log store’s queue, so a log write during
  // the replay will wait for the transaction, which waits for the write.
  let tasks = createCrdtTasks(crdt, { onError: reportTaskError })

  /**
   * Reasons of the log tracking. Everything else (`syncing`,
   * `applying-to-db`) belongs to Logux and must not be moved to the shadow.
   */
  function isCellReason(reason: string): boolean {
    if (reason === 'tombstone') return true
    return Object.hasOwn(crdt.tables, reason.split('/')[0]!)
  }

  /**
   * Every reason, which the row could be kept by.
   */
  function reasonsOf(plural: string, id: string): string[] {
    let reasons = [`${plural}/${id}`]
    for (let field in crdt.tables[plural]) {
      reasons.push(`${plural}/${id}/${field}`)
    }
    return reasons
  }

  /**
   * IDs of the actions, which were replaced by the shadow. Their `clean`
   * event must not ask the server to remove them.
   */
  let shadowed = new Set<string>()

  /**
   * Nobody owns cells of the deleted row anymore.
   */
  async function forgetRows(plural: string, ids: string[]): Promise<void> {
    for (let id of ids) {
      await logux.log.removeReason(reasonsOf(plural, id), {
        index: `${plural}/${id}`
      })
    }
  }

  /**
   * Previous owners of the won cells lost them, and this action lost
   * the cells, which it touched but did not win.
   */
  async function forgetCells(
    plural: string,
    ids: string[],
    won: string[],
    lost: string[],
    meta: ClientMeta | MetaTime
  ): Promise<void> {
    // `isFirstOlder()` reads only `id` and `time`, but asks for the whole meta
    let applied: Meta = { added: 0, id: meta.id, reasons: [], time: meta.time }
    if (won.length > 0) {
      for (let id of ids) {
        await logux.log.removeReason(won, {
          index: `${plural}/${id}`,
          olderThan: applied
        })
      }
    }
    if ('reasons' in meta) {
      if (lost.length > 0) {
        await logux.log.removeReason(lost, { id: meta.id })
      }
    } else if (won.length > 0) {
      // The action was restored from the tables, so its shadow could lose
      // the reasons of the cells, which it still owns. The shadow keeps
      // the ID of the original action in its indexes
      await logux.log.addReason(won, { index: meta.id })
    }
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
    if (!action || !meta || !parseCrdtType(action.type, crdt)) return
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
      await logux.log.addReason(reasons, { id: previous.id })
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
    if (expired.length > 0) {
      await logux.log.removeReason('tombstone', { ids: expired })
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
      } else if (parseCrdtType(action.type, crdt)) {
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

  let unbinds = [
    logux.on('preadd', (action, meta) => {
      let parsed = parseCrdtAction(action, crdt)
      if (!parsed || parsed.rows.length === 0) return
      let { plural, rows, verb } = parsed
      if (verb === 'deleted') {
        meta.indexes = ['tombstone']
        meta.reasons.push('tombstone')
      } else {
        for (let [id, fields] of rows) {
          for (let field of fields) {
            meta.reasons.push(`${plural}/${id}/${field}`)
          }
          // Without it the create is cleaned as soon as every its cell was
          // overwritten and a new device will get only `*/changed` actions
          if (verb === 'created') meta.reasons.push(`${plural}/${id}`)
        }
        meta.indexes = [plural, ...rows.map(row => `${plural}/${row[0]}`)]
      }
    }),

    crdt.on('applied', (tx, action, meta, won, touched) => {
      let parsed = parseCrdtType(action.type, crdt)
      if (!parsed) return
      let { plural, verb } = parsed
      if (verb === 'deleted') {
        // The only case without cells to take the rows from
        let ids = parseCrdtRows(action).map(row => row[0])
        if (ids.length > 0) tasks.add(() => forgetRows(plural, ids))
      } else if (touched.length > 0) {
        let ids = [...new Set(touched.map(cell => cell[1]))]
        let winners = new Set(toReasons(won))
        let lost = toReasons(touched).filter(cell => !winners.has(cell))
        tasks.add(() => forgetCells(plural, ids, [...winners], lost, meta))
      }
      // The action, which came from the server, will never be sent back,
      // so there is no `logux/processed` to wait for
      if ('reasons' in meta && !meta.sync) {
        tasks.add(() => shadowAction(meta.id))
      }
    }),

    logux.on('clean', (action, meta) => {
      if (shadow.match(action)) {
        cleaning.add(action.id)
      } else if (
        parseCrdtType(action.type, crdt) &&
        !shadowed.delete(meta.id)
      ) {
        cleaning.add(meta.id)
      } else {
        return
      }
      cleanOnServer()
    }),

    logux.type(loguxProcessed, action => {
      // Unconfirmed action is our outbox copy and may be re-sent,
      // so own actions become shadows only after the server confirmation
      tasks.add(() => shadowAction(action.id))
    }),

    logux.on('state', () => {
      if (logux.state === 'synchronized') tasks.add(expireTombstones)
    })
  ]

  tasks.add(repairLog)

  return {
    destroy() {
      cleanOnServer.cancel()
      for (let unbind of unbinds) unbind()
      tasks.destroy()
    },
    finish() {
      return tasks.finish()
    }
  }
}
