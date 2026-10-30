// Chrome and Firefox keep the database as a file in OPFS. Safari can do it
// only by the `opfs-sahpool` VFS without multi-tab support.

import { wasmWorker } from '@nanostores/sql/wasm-worker'
import type { SAHPoolUtil } from '@sqlite.org/sqlite-wasm'

const DATABASE = 'slowreader.sqlite'

export type FromWorker =
  | { database: ArrayBuffer; type: 'dumped' }
  | { error: string; type: 'dumpFailed' }
  | { error: string; type: 'noDb' }
  | { type: 'reload' }
  | { type: 'secondTab' }

export type ToWorker = { type: 'dump' }

function send(message: FromWorker, transfer: Transferable[] = []): void {
  postMessage(message, { transfer })
}

let pool: SAHPoolUtil | undefined

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

function isSingleTab(): Promise<boolean> {
  return new Promise(resolve => {
    if (!navigator.locks) {
      resolve(true)
      return
    }
    let lock = 'slowreader:sahpool'
    void navigator.locks.request(lock, { ifAvailable: true }, async held => {
      resolve(held !== null)
      if (held) return new Promise(() => {})
      send({ type: 'secondTab' })
      await navigator.locks.request(lock, () => {})
      send({ type: 'reload' })
    })
  })
}

// The page passes the VFS as the worker’s name
wasmWorker(
  async sqlite3 => {
    if (self.name === 'opfs') return new sqlite3.oo1.OpfsDb(DATABASE, 'cw')
    // The page shows `secondTab` error and reloads when the other tab closes
    if (!(await isSingleTab())) return new Promise(() => {})
    // The pool keeps a file open for every slot: one for the database,
    // one for its journal, the rest for the temporary files of big queries
    pool = await sqlite3.installOpfsSAHPoolVfs({ initialCapacity: 6 })
    await importDemo(pool)
    return new pool.OpfsSAHPoolDb(DATABASE)
  },
  // Only OPFS VFS supports multiple tabs
  { channel: self.name === 'opfs' ? 'slowreader:database' : undefined }
).catch((error: unknown) => {
  send({ error: String(error), type: 'noDb' })
})

function dumpDatabase(): void {
  try {
    if (!pool) throw new Error('No database in the pool')
    let { buffer } = pool.exportFile(`/${DATABASE}`)
    send({ database: buffer as ArrayBuffer, type: 'dumped' }, [buffer])
  } catch (error) {
    send({ error: String(error), type: 'dumpFailed' })
  }
}

// The same port also has messages of the database driver
addEventListener('message', ({ data }: MessageEvent<{ type: string }>) => {
  if (data.type === 'dump') dumpDatabase()
})
