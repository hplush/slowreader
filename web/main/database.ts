// SQLite storage engine. Isolated browsers keep the database as a file
// in OPFS, the others use the pool of the `opfs-sahpool` VFS.

import { type Database, openDb } from '@nanostores/sql'
import { sqlocalDriver } from '@nanostores/sql/sqlocal'
import { fatal } from '@slowreader/core'

import type { SahpoolMessage } from './sahpool-worker.ts'

type Vfs = 'opfs' | 'sahpool'

function chooseVfs(): Vfs {
  let saved = localStorage.getItem('slowreader:vfs')
  if (saved === 'opfs' || saved === 'sahpool') return saved
  let vfs: Vfs = crossOriginIsolated ? 'opfs' : 'sahpool'
  localStorage.setItem('slowreader:vfs', vfs)
  return vfs
}

let vfs = chooseVfs()

export function createDatabase(): Database {
  let processor
  if (vfs === 'sahpool') {
    processor = new Worker(new URL('./sahpool-worker.ts', import.meta.url), {
      type: 'module'
    })
    processor.addEventListener(
      'message',
      // Other messages of the worker are SQLocal’s own protocol
      ({ data }: MessageEvent<SahpoolMessage | { slowreader?: undefined }>) => {
        if (data.slowreader === 'secondTab') {
          fatal.set({ type: 'secondTab' })
        } else if (data.slowreader === 'reload') {
          location.reload()
        } else if (data.slowreader === 'noDb') {
          fatal.set({ error: data.error, type: 'noDb' })
        }
      }
    )
  }
  let db = openDb(sqlocalDriver('slowreader.sqlite', { processor }))
  // SQLocal falls back to the in-memory database when the browser refused
  // the storage, and then every start looks like a broken one
  void db.select<{ file: string }>`PRAGMA database_list`.then(([main]) => {
    if (!main?.file && !fatal.get()) {
      fatal.set({ error: undefined, type: 'noDb' })
    }
  })
  return db
}
