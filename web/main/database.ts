// SQLite storage engine. Isolated browsers keep the database as a file
// in OPFS, the others use the pool of the `opfs-sahpool` VFS.

import { type Database, openDb } from '@nanostores/sql'
import { type WasmDriver, wasmDriver } from '@nanostores/sql/wasm'
import { fatal, showCrash, userId } from '@slowreader/core'

import type { FromWorker } from './db-worker.ts'
import { deleteTelegramDatabases } from './telegram.ts'

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
  // The tab with the database holds this lock, so the files are deleted after
  // other tabs closed the database and before the next sign-in opens it
  await navigator.locks.request('slowreader:database', async () => {
    let root = await navigator.storage.getDirectory()
    for await (let name of root.keys()) {
      await root.removeEntry(name, { recursive: true }).catch(() => {})
    }
  })
  await deleteTelegramDatabases()
  localStorage.removeItem('slowreader:wipe')
}

let vfs = chooseVfs()

let current: undefined | WasmDriver

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
    if (data.type === 'noDb') {
      fatal.set({ error: data.error, type: 'noDb' })
    } else if (data.type === 'crash') {
      showCrash(data.error)
    }
  })
  current = wasmDriver(worker)
  return openDb(current)
}

/**
 * Database file as the browser keeps it, to attach it to a bug report.
 */
export async function dumpDatabase(): Promise<Blob> {
  if (!current) throw new Error('No database to dump')
  return new Blob([new Uint8Array(await current.export())], {
    type: 'application/x-sqlite3'
  })
}
