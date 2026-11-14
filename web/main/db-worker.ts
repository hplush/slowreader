// Chrome and Firefox keep the database as a file in OPFS. Safari can do it
// only by the `opfs-sahpool` VFS. Only one tab opens the database,
// workers of other tabs send their queries to it.

import { wasmWorker } from '@nanostores/sql/wasm-worker'
import type { SAHPoolUtil } from '@sqlite.org/sqlite-wasm'

const DATABASE = 'slowreader.sqlite'

export type FromWorker =
  | { error: string; type: 'noDb' }
  | { error: unknown; type: 'crash' }

function isBusyByClosingTab(error: DOMException): boolean {
  return (
    error.name === 'NoModificationAllowedError' ||
    error.name === 'InvalidStateError'
  )
}

function isStorageMissing(error: unknown): boolean {
  return (
    (error instanceof DOMException && !isBusyByClosingTab(error)) ||
    !globalThis.FileSystemFileHandle?.prototype.createSyncAccessHandle
  )
}

function send(message: FromWorker): void {
  postMessage(message)
}

// The demo page can not write inside the pool, so it leaves the database
// in the OPFS root and the app moves it into the pool on the next start
async function importDemo(sahpool: SAHPoolUtil): Promise<void> {
  let root = await navigator.storage.getDirectory()
  let handle
  try {
    handle = await root.getFileHandle(DATABASE)
  } catch {
    return
  }
  let reader = (await handle.getFile()).stream().getReader()
  await sahpool.importDb(
    `/${DATABASE}`,
    async () => (await reader.read()).value
  )
  await root.removeEntry(DATABASE)
}

// Not inlined, since SQLite types miss `forceReinitIfPreviouslyFailed`
let poolOptions = {
  // The driver opens the pool again, if the closed tab still holds the files.
  // Without it the next try gets the saved error of the first one.
  forceReinitIfPreviouslyFailed: true,
  // The pool keeps a file open for every slot: one for the database,
  // one for its journal, the rest for the temporary files of big queries
  initialCapacity: 6,
  // By default the failed opening deletes the pool with the database
  preserveOnInitFailure: true
}

// The page passes the VFS as the worker’s name
wasmWorker(
  async sqlite3 => {
    if (self.name === 'opfs') {
      let db = new sqlite3.oo1.OpfsDb(DATABASE, 'cw')
      // The only connection keeps the file open between the queries,
      // which makes reading in Firefox 20 times faster
      db.exec('PRAGMA locking_mode = EXCLUSIVE')
      return db
    } else {
      let pool = await sqlite3.installOpfsSAHPoolVfs(poolOptions)
      await importDemo(pool)
      return new pool.OpfsSAHPoolDb(DATABASE)
    }
  },
  { shared: 'slowreader:database' }
).catch((error: unknown) => {
  if (isStorageMissing(error)) {
    send({ error: String(error), type: 'noDb' })
  } else {
    send({ error, type: 'crash' })
  }
})
