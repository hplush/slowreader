// SQLite storage engine. Isolated browsers keep the database as a file
// in OPFS, the others use the pool of the `opfs-sahpool` VFS.

import { type Database, openDb } from '@nanostores/sql'
import { wasmDriver } from '@nanostores/sql/wasm'
import { fatal, userId } from '@slowreader/core'

import type { FromWorker, ToWorker } from './db-worker.ts'

type Vfs = 'opfs' | 'sahpool'

function chooseVfs(): Vfs {
  let saved = localStorage.getItem('slowreader:vfs')
  if (saved === 'opfs' || saved === 'sahpool') return saved
  let vfs: Vfs = crossOriginIsolated ? 'opfs' : 'sahpool'
  localStorage.setItem('slowreader:vfs', vfs)
  return vfs
}

// The opened database holds its files, so they are deleted on the next start
if (localStorage.getItem('slowreader:wipe')) {
  let root = await navigator.storage.getDirectory()
  for await (let name of root.keys()) {
    await root.removeEntry(name, { recursive: true }).catch(() => {})
  }
  localStorage.removeItem('slowreader:wipe')
}

let vfs = chooseVfs()

let current: undefined | Worker

// Browsers evict best-effort storage under disk pressure. Chrome grants
// the persistence silently to the sites the user comes back to, Firefox
// asks, so the app waits for the account to have something worth asking for.
userId.subscribe(user => {
  if (user) void navigator.storage.persist()
})

export function createDatabase(): Database {
  let worker = new Worker(new URL('./db-worker.ts', import.meta.url), {
    name: vfs,
    type: 'module'
  })
  worker.addEventListener('message', ({ data }: MessageEvent<FromWorker>) => {
    if (data.type === 'secondTab') {
      fatal.set({ type: 'secondTab' })
    } else if (data.type === 'reload') {
      location.reload()
    } else if (data.type === 'noDb') {
      fatal.set({ error: data.error, type: 'noDb' })
    }
  })
  current = worker
  return openDb(wasmDriver(worker))
}

function requestDatabase(worker: Worker): Promise<Blob> {
  return new Promise((resolve, reject) => {
    function onDumped({ data }: MessageEvent<FromWorker>): void {
      if (data.type === 'dumped') {
        worker.removeEventListener('message', onDumped)
        resolve(new Blob([data.database], { type: 'application/x-sqlite3' }))
      } else if (data.type === 'dumpFailed') {
        worker.removeEventListener('message', onDumped)
        reject(new Error(data.error))
      }
    }
    worker.addEventListener('message', onDumped)
    worker.postMessage({ type: 'dump' } satisfies ToWorker)
  })
}

/**
 * Database file as the browser keeps it, to attach it to a bug report.
 */
export async function dumpDatabase(): Promise<Blob> {
  if (vfs === 'opfs') {
    let root = await navigator.storage.getDirectory()
    return (await root.getFileHandle('slowreader.sqlite')).getFile()
  } else if (current) {
    return requestDatabase(current)
  } else {
    throw new Error('No database to dump')
  }
}
