import type { SqlStoreValue } from '@nanostores/sql'
import { atom, type ReadableAtom, type WritableAtom } from 'nanostores'

export interface SyncedSetting<
  Row,
  Value = unknown
> extends WritableAtom<Value> {
  changesFor(row: Partial<Row> | undefined): Partial<Row> | undefined
  loadRow(row: Partial<Row> | undefined): void
}

interface SettingsTable<Row> {
  create(fields: Partial<Row> & { id: string }): Promise<unknown>
  row(id: string): ReadableAtom<SqlStoreValue<Row | undefined>>
  update(id: string, diff: Partial<Row>): Promise<unknown>
}

export function createSyncedSetting<Row>(): <Column extends keyof Row>(
  column: Column,
  initial: NonNullable<Row[Column]>
) => SyncedSetting<Row, NonNullable<Row[Column]>> {
  return (column, initial) => {
    let store = atom(initial)

    function fromRow(row: Partial<Row> | undefined): typeof initial {
      return row?.[column] ?? initial
    }

    return Object.assign(store, {
      changesFor(row: Partial<Row> | undefined): Partial<Row> | undefined {
        let value = store.get()
        if (JSON.stringify(value) === JSON.stringify(fromRow(row))) {
          return undefined
        }
        let changes: Partial<Row> = {}
        changes[column] = value
        return changes
      },
      loadRow(row: Partial<Row> | undefined): void {
        store.set(fromRow(row))
      }
    })
  }
}

/**
 * `newRow` must not have settings: another device could create the row too.
 */
export function syncSettings<Row>(
  table: SettingsTable<Row>,
  id: string,
  settings: SyncedSetting<Row>[],
  loading: WritableAtom<boolean>,
  newRow: () => Partial<Row>
): () => void {
  loading.set(true)
  let row: Row | undefined
  // The row of the older write must not revert newer local changes
  let unsaved: Partial<Row> = {}
  let created = false

  let unbindRow = table.row(id).subscribe(value => {
    if (value.status !== 'ready') return
    row = value.value
    if (row) created = false
    for (let key in unsaved) {
      if (JSON.stringify(row?.[key]) === JSON.stringify(unsaved[key])) {
        delete unsaved[key]
      }
    }
    for (let setting of settings) setting.loadRow({ ...row, ...unsaved })
    loading.set(false)
  })

  let unbinds = settings.map(setting =>
    setting.listen(() => {
      if (loading.get()) return
      let changes = setting.changesFor({ ...row, ...unsaved })
      if (!changes) return
      Object.assign(unsaved, changes)
      if (!row && !created) {
        created = true
        table.create({ id, ...newRow() }).catch(() => {})
      }
      table.update(id, changes).catch(() => {})
    })
  )

  return () => {
    unbindRow()
    for (let unbind of unbinds) unbind()
    loading.set(true)
  }
}
