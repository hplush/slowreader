// SQLite storage engine. Isolated browsers keep the database as a file
// in OPFS, the others use the pool of the `opfs-sahpool` VFS.

import { type Database, openDb } from '@nanostores/sql'
import { sqlocalDriver } from '@nanostores/sql/sqlocal'
import { fatal } from '@slowreader/core'

import type { FromWorker, ToWorker } from './sahpool-worker.ts'

const DATABASE = 'slowreader.sqlite'

type Vfs = 'opfs' | 'sahpool'

function chooseVfs(): Vfs {
  let saved = localStorage.getItem('slowreader:vfs')
  if (saved === 'opfs' || saved === 'sahpool') return saved
  let vfs: Vfs = crossOriginIsolated ? 'opfs' : 'sahpool'
  localStorage.setItem('slowreader:vfs', vfs)
  return vfs
}

let vfs = chooseVfs()

let current: undefined | Worker

export function createDatabase(): Database {
  let processor
  if (vfs === 'sahpool') {
    processor = new Worker(new URL('./sahpool-worker.ts', import.meta.url), {
      type: 'module'
    })
    processor.addEventListener(
      'message',
      // Other messages of the worker are SQLocal’s own protocol
      ({ data }: MessageEvent<FromWorker | { slowreader?: undefined }>) => {
        if (data.slowreader === 'secondTab') {
          fatal.set({ type: 'secondTab' })
        } else if (data.slowreader === 'reload') {
          location.reload()
        } else if (data.slowreader === 'noDb') {
          fatal.set({ error: data.error, type: 'noDb' })
        }
      }
    )
    current = processor
  }
  let db = openDb(sqlocalDriver(DATABASE, { processor }))
  // SQLocal falls back to the in-memory database when the browser refused
  // the storage, and then every start looks like a broken one
  void db.select<{ file: string }>`PRAGMA database_list`.then(([main]) => {
    if (!main?.file && !fatal.get()) {
      fatal.set({ error: undefined, type: 'noDb' })
    }
  })
  return db
}

function requestDatabase(processor: Worker): Promise<Blob> {
  return new Promise((resolve, reject) => {
    function onExported({
      data
    }: MessageEvent<FromWorker | { slowreader?: undefined }>): void {
      if (data.slowreader === 'database') {
        processor.removeEventListener('message', onExported)
        resolve(new Blob([data.database], { type: 'application/x-sqlite3' }))
      } else if (data.slowreader === 'exportError') {
        processor.removeEventListener('message', onExported)
        reject(new Error(data.error))
      }
    }
    processor.addEventListener('message', onExported)
    processor.postMessage({ slowreader: 'export' } satisfies ToWorker)
  })
}

/**
 * Database file as the browser keeps it, to attach it to a bug report.
 */
export async function exportDatabase(): Promise<Blob> {
  if (vfs === 'opfs') {
    let root = await navigator.storage.getDirectory()
    return (await root.getFileHandle(DATABASE)).getFile()
  } else if (current) {
    return requestDatabase(current)
  } else {
    throw new Error('No database to export')
  }
}
