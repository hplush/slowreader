import type { ClientMeta } from '@logux/client'
import type { Log } from '@logux/core'

export interface ReasonChanges {
  /**
   * Add reasons, which the action does not have yet.
   */
  add(meta: ClientMeta, reasons: string[]): void

  /**
   * Remove every reason, which did not pass the check.
   */
  keep(meta: ClientMeta, check: (reason: string) => boolean): void

  /**
   * Write the collected changes to the log.
   */
  write(log: Log): Promise<void>
}

/**
 * Changes of the reasons, collected before the write.
 *
 * Reasons of the same action can be changed by a few rows of the table,
 * so the changes are merged to write every action only once.
 */
export function createReasonChanges(): ReasonChanges {
  let changes = new Map<string, string[]>()

  function current(meta: ClientMeta): string[] {
    return changes.get(meta.id) ?? meta.reasons
  }

  return {
    add(meta, reasons) {
      let before = current(meta)
      let after = before.concat(reasons.filter(i => !before.includes(i)))
      if (after.length !== before.length) changes.set(meta.id, after)
    },
    keep(meta, check) {
      let before = current(meta)
      let after = before.filter(check)
      if (after.length !== before.length) changes.set(meta.id, after)
    },
    async write(log) {
      for (let [id, reasons] of changes) {
        await log.changeMeta(id, { reasons })
      }
    }
  }
}
