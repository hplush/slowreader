// SQLocal’s own worker with the drivers for both VFS. SQLocal hides
// the reason of a failed open and switches to the in-memory database,
// so the page needs the error to explain the browser’s refusal.
// See main/database.ts.

import type { SAHPoolUtil } from '@sqlite.org/sqlite-wasm'
import {
  type DriverConfig,
  SQLiteMemoryDriver,
  SQLiteOpfsDriver,
  SQLocalProcessor
} from 'sqlocal'

const LOCK = 'slowreader:sahpool'

export type FromWorker =
  | { database: ArrayBuffer; slowreader: 'database' }
  | { error: string; slowreader: 'dumpError' | 'noDb' }
  | { slowreader: 'reload' | 'secondTab' }

export type ToWorker = { slowreader: 'dump' }

function send(message: FromWorker, transfer: Transferable[] = []): void {
  postMessage(message, { transfer })
}

// Chrome on Android can refuse the first OPFS call right after its start,
// while the storage is still initializing, and a retry a moment later works
async function open(connect: () => Promise<void>): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      await connect()
      return
    } catch (error) {
      if (attempt === 3) {
        send({ error: String(error), slowreader: 'noDb' })
        throw error
      }
      await new Promise(resolve => setTimeout(resolve, 500 * 2 ** attempt))
    }
  }
}

// Without the Web Locks API the pool’s own error is the only guard left
let single = new Promise<boolean>(resolve => {
  if (!navigator.locks) {
    resolve(true)
    return
  }
  void navigator.locks.request(LOCK, { ifAvailable: true }, async lock => {
    resolve(lock !== null)
    if (lock) return new Promise(() => {})
    send({ slowreader: 'secondTab' })
    // The other tab was closed, so this tab can take the database
    await navigator.locks.request(LOCK, () => {})
    send({ slowreader: 'reload' })
  })
})

function poolPath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`
}

// The demo page can not write inside the pool, so it leaves the database
// in the OPFS root and the app moves it into the pool on the next start
async function importDemo(pool: SAHPoolUtil, path: string): Promise<void> {
  let root = await navigator.storage.getDirectory()
  let handle
  try {
    handle = await root.getFileHandle(path)
  } catch {
    return
  }
  let reader = (await handle.getFile()).stream().getReader()
  await pool.importDb(poolPath(path), async () => (await reader.read()).value)
  await root.removeEntry(path)
}

class OpfsDriver extends SQLiteOpfsDriver {
  override init(config: DriverConfig): Promise<void> {
    return open(() => super.init(config))
  }
}

class SahpoolDriver extends SQLiteMemoryDriver {
  override readonly storageType = 'sahpool'

  private pool?: SAHPoolUtil

  override async clear(): Promise<void> {
    let { path, pool } = this.getPool()
    await this.destroy()
    pool.unlink(path)
  }

  override async export(): Promise<{
    data: Uint8Array<ArrayBuffer>
    name: string
  }> {
    let { name, path, pool } = this.getPool()
    return { data: new Uint8Array(await pool.exportFile(path)), name }
  }

  override async import(
    database: ArrayBuffer | ReadableStream<Uint8Array> | Uint8Array
  ): Promise<void> {
    let { path, pool } = this.getPool()
    await this.destroy()
    if (database instanceof ReadableStream) {
      let reader = database.getReader()
      await pool.importDb(path, async () => (await reader.read()).value)
    } else {
      await pool.importDb(path, database)
    }
  }

  override async init(config: DriverConfig): Promise<void> {
    let { databasePath } = config
    if (!databasePath) throw new Error('No databasePath specified')
    if (!(await single)) throw new Error('Another tab has the database')

    await open(async () => {
      let init = this.sqlite3InitModule
      if (!init) {
        init = (await import('@sqlite.org/sqlite-wasm')).default
        this.sqlite3InitModule = init
      }
      let sqlite3 = this.sqlite3 ?? (await init())
      this.sqlite3 = sqlite3

      // The pool keeps a file open for every slot: one for the database,
      // one for its journal, the rest for the temporary files of big queries.
      // `forceReinitIfPreviouslyFailed` is missing in the typings.
      let pool = await sqlite3.installOpfsSAHPoolVfs(
        Object.assign(
          { initialCapacity: 6 },
          { forceReinitIfPreviouslyFailed: true }
        )
      )
      this.pool = pool

      if (this.db) await this.destroy()
      await importDemo(pool, databasePath)
      this.db = new pool.OpfsSAHPoolDb(databasePath)
      this.config = config
      this.initWriteHook()
    })
  }

  override async isDatabasePersisted(): Promise<boolean> {
    return navigator.storage.persisted()
  }

  private getPool(): { name: string; path: string; pool: SAHPoolUtil } {
    let name = this.config?.databasePath
    if (!this.pool || !name) throw new Error('Driver not initialized')
    return { name, path: poolPath(name), pool: this.pool }
  }
}

// The page passes the VFS as the worker’s name
let driver = self.name === 'opfs' ? new OpfsDriver() : new SahpoolDriver()
let processor = new SQLocalProcessor(driver)

// `onmessage` of the processor is SQLocal’s own callback, not a DOM handler
Object.assign(processor, {
  onmessage(message, transfer) {
    postMessage(message, { transfer })
  }
} satisfies Pick<typeof processor, 'onmessage'>)

addEventListener('message', event => {
  let message = event.data as { slowreader?: undefined } | ToWorker
  if (message.slowreader === 'dump') {
    void driver.export().then(
      ({ data }) => {
        let buffer = data instanceof Uint8Array ? data.buffer : data
        send({ database: buffer, slowreader: 'database' }, [buffer])
      },
      (error: unknown) => {
        send({ error: String(error), slowreader: 'dumpError' })
      }
    )
  } else {
    void processor.postMessage(event)
  }
})
