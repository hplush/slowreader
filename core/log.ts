// The log keeps only what the tables can not restore: unsent actions,
// tombstones and shadows of actions, which own a cell on the server.

import { loguxProcessed, shadow, zeroClean } from '@logux/actions'
import { type Client, type ClientMeta, replaceWithShadow } from '@logux/client'
import {
  type CrdtCell,
  type CrdtDatabase,
  createCrdtTasks,
  parseCrdtRows,
  parseCrdtType
} from '@logux/client/db'
import type { Action, MetaTime } from '@logux/core'
import { RETENTION } from '@slowreader/api'
import debounce from 'just-debounce-it'

import { getEnvironment } from './environment.ts'
import { deletePost } from './post.ts'

export interface LogTracker {
  destroy(): void
  finish(): Promise<void>
  trackRestored(entries: [Action, MetaTime][]): void
}

function toReasons(cells: CrdtCell[]): string[] {
  return cells.map(cell => cell.join('/'))
}

const TABLE_ACTION_KEYS = new Set(['fields', 'id', 'ids', 'records', 'type'])

export function isFromLog(meta: ClientMeta | MetaTime): meta is ClientMeta {
  return 'reasons' in meta
}

/**
 * Also tables of the newer app. Server actions have other keys.
 */
function isTableAction(action: Action): boolean {
  let keys = Object.keys(action)
  return (
    /^\w+s\/(created|changed|deleted)$/.test(action.type) &&
    keys.some(key => key === 'id' || key === 'ids' || key === 'records') &&
    keys.every(key => TABLE_ACTION_KEYS.has(key))
  )
}

function cellsOf(fields: object | undefined): string[] {
  return Object.entries(fields ?? {})
    .filter(([key, value]) => value !== undefined && key !== 'id')
    .map(([key]) => key)
}

/**
 * Delayed, so the throwing warning of tests will not break the queue.
 */
/* node:coverage disable */
function reportTaskError(error: unknown): void {
  setTimeout(() => {
    getEnvironment().warn(error)
  })
}
/* node:coverage enable */

/**
 * Only for the cloud user: local actions are never sent, so they are not kept.
 */
export function trackLog(logux: Client, crdt: CrdtDatabase): LogTracker {
  // Tasks read reasons and write them back, so they run one by one.
  // They wait for `ready`: a log write during the migration replay deadlocks.
  let tasks = createCrdtTasks(crdt, { onError: reportTaskError })

  /**
   * Shadow must not get Logux reasons like `syncing`.
   */
  function isCellReason(reason: string): boolean {
    if (reason === 'tombstone') return true
    return Object.hasOwn(crdt.tables, reason.split('/')[0]!)
  }

  /**
   * Their `clean` event must not remove them on the server.
   */
  let shadowed = new Set<string>()

  /**
   * Reasons are read from the log: the schema lacks columns of the newer app.
   */
  async function forgetRows(plural: string, ids: string[]): Promise<void> {
    for (let id of ids) {
      let row = `${plural}/${id}`
      let reasons = new Set<string>()
      await logux.log.each({ index: row }, (action, meta) => {
        for (let reason of meta.reasons) {
          if (reason === row || reason.startsWith(`${row}/`)) {
            reasons.add(reason)
          }
        }
      })
      if (reasons.size > 0) {
        await logux.log.removeReason([...reasons], { index: row })
      }
    }
  }

  /**
   * Remove `won` cells from older actions and `lost` cells from this one.
   */
  async function forgetCells(
    plural: string,
    ids: string[],
    won: string[],
    lost: string[],
    meta: ClientMeta | MetaTime
  ): Promise<void> {
    if (won.length > 0) {
      // Shadow of this action may look older, `exceptIndex` keeps its cells
      await Promise.all(
        ids.map(id => {
          return logux.log.removeReason(won, {
            exceptIndex: meta.id,
            index: `${plural}/${id}`,
            olderThan: meta
          })
        })
      )
    }
    if (isFromLog(meta)) {
      if (lost.length > 0) {
        await logux.log.removeReason(lost, { id: meta.id })
      }
    } else if (won.length > 0) {
      // Restored from the tables, so the won cells go back to its shadow
      await logux.log.addReason(won, { index: meta.id })
    }
  }

  async function findShadow(id: string): Promise<ClientMeta | undefined> {
    let found: ClientMeta | undefined
    await logux.log.each({ index: id }, (action, meta) => {
      found = meta
      return false
    })
    return found
  }

  /**
   * The body duplicates the tables, the shadow keeps only the meta.
   */
  async function shadowAction(id: string): Promise<void> {
    let [action, meta] = await logux.log.byId(id)
    let parsed = action && parseCrdtType(action.type, crdt)
    if (!action || !meta || !parsed) return
    let columns = crdt.tables[parsed.plural]!
    let newer = parseCrdtRows(action).some(([, fields]) => {
      return cellsOf(fields).some(cell => !Object.hasOwn(columns, cell))
    })
    // The shadow would lose values of columns, which only the newer app knows
    if (newer) return
    let reasons = meta.reasons.filter(isCellReason)
    // Owns no cells, so Logux removes it with its last reason
    if (reasons.length === 0) return
    shadowed.add(id)
    let previous = await findShadow(id)
    if (previous) {
      // The re-sent action could win the cells back from its own shadow
      await logux.log.addReason(reasons, { id: previous.id })
      await logux.log.changeMeta(id, { reasons: [] })
    } else {
      await replaceWithShadow(logux, {
        ...meta,
        // The server re-sends unconfirmed actions, this index finds the shadow
        indexes: [...(meta.indexes ?? []), id],
        reasons
      })
    }
  }

  // Reading a page of posts cleans hundreds of actions at once
  let cleaning = new Set<string>()
  let cleanOnServer = debounce(() => {
    let ids = [...cleaning]
    cleaning.clear()
    tasks.add(async () => {
      await logux.log.add(zeroClean({ ids }), { sync: true })
    })
  }, 1)

  // The server confirms actions one by one
  let confirmed = new Set<string>()
  let shadowConfirmed = debounce(() => {
    let ids = [...confirmed]
    confirmed.clear()
    tasks.add(async () => {
      await Promise.all(ids.map(id => shadowAction(id)))
    })
  }, 1)

  /**
   * Tombstone has no row to lose its reason, so any device expires it by time.
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
   * The tab closed between adding the shadow and removing the body leaves both.
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

  let restoredCells = new Map<string, Set<string>>()

  let unbinds = [
    logux.on('preadd', (action, meta) => {
      if (!isTableAction(action)) return
      let [plural, verb] = action.type.split('/')
      let rows = parseCrdtRows(action)
      if (rows.length === 0) return
      let indexes = rows.map(row => `${plural}/${row[0]}`)
      if (verb === 'deleted') {
        // Every device deletes old rows of these tables by itself
        if (
          plural === 'usages' ||
          plural === 'views' ||
          plural === 'reactions'
        ) {
          meta.indexes = indexes
        } else {
          meta.indexes = ['tombstone', ...indexes]
          meta.reasons.push('tombstone')
        }
      } else {
        let owned = restoredCells.get(meta.id)
        restoredCells.delete(meta.id)
        for (let [id, fields] of rows) {
          for (let cell of cellsOf(fields)) {
            let reason = `${plural}/${id}/${cell}`
            if (!owned || owned.has(reason)) meta.reasons.push(reason)
          }
          if (verb === 'created') meta.reasons.push(`${plural}/${id}`)
        }
        meta.indexes = [plural!, ...indexes]
      }
    }),

    logux.on('add', action => {
      // The newer app’s table is not applied, so rows are forgotten here
      if (isTableAction(action) && action.type.endsWith('/deleted')) {
        let plural = action.type.split('/')[0]!
        let ids = parseCrdtRows(action).map(row => row[0])
        if (ids.length > 0) tasks.add(() => forgetRows(plural, ids))
      }
    }),

    crdt.on('applied', (tx, action, meta, won, touched) => {
      let parsed = parseCrdtType(action.type, crdt)
      if (!parsed) return
      let { plural, verb } = parsed
      if (touched.length > 0) {
        let ids = [...new Set(touched.map(cell => cell[1]))]
        let winners = new Set(toReasons(won))
        let lost = toReasons(touched).filter(cell => !winners.has(cell))
        tasks.add(() => forgetCells(plural, ids, [...winners], lost, meta))
        if (plural === 'posts' && verb === 'created') {
          // Refresh could add a post again after its deletion
          tasks.add(async () => {
            let resurrected: string[] = []
            await Promise.all(
              ids.map(id => {
                return logux.log.each(
                  { index: `posts/${id}` },
                  (post, deleted) => {
                    if (deleted.reasons.includes('tombstone')) {
                      resurrected.push(id)
                      return false
                    }
                  }
                )
              })
            )
            if (resurrected.length > 0) await deletePost(resurrected)
          })
        }
      }
      // Actions from the server get no `logux/processed`
      if (isFromLog(meta) && !meta.sync) {
        tasks.add(() => shadowAction(meta.id))
      }
    }),

    logux.on('clean', (action, meta) => {
      if (shadow.match(action)) {
        cleaning.add(action.id)
      } else if (isTableAction(action) && !shadowed.delete(meta.id)) {
        cleaning.add(meta.id)
      } else {
        return
      }
      cleanOnServer()
    }),

    logux.type(loguxProcessed, action => {
      // Own action may be re-sent until the server confirms it
      confirmed.add(action.id)
      shadowConfirmed()
    }),

    logux.on('state', () => {
      if (logux.state === 'synchronized') tasks.add(expireTombstones)
    })
  ]

  tasks.add(repairLog)

  return {
    destroy() {
      cleanOnServer.cancel()
      shadowConfirmed.cancel()
      for (let unbind of unbinds) unbind()
      tasks.destroy()
    },
    finish() {
      return tasks.finish()
    },
    trackRestored(entries) {
      let later = new Set<string>()
      for (let [action, meta] of entries.toReversed()) {
        let plural = action.type.split('/')[0]
        let owned = new Set<string>()
        for (let [id, fields] of parseCrdtRows(action)) {
          for (let cell of cellsOf(fields)) {
            let reason = `${plural}/${id}/${cell}`
            if (!later.has(reason)) owned.add(reason)
            later.add(reason)
          }
        }
        restoredCells.set(meta.id, owned)
      }
    }
  }
}
