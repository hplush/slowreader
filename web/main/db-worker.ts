// Replacement for SQLocal’s own worker:
// For Chrome/FF: we add init error reporting
// For Safari: we use custom sahpool driver since it doesn't support same-origin

import type { SAHPoolUtil } from '@sqlite.org/sqlite-wasm'
import {
  type DriverConfig,
  SQLiteMemoryDriver,
  SQLiteOpfsDriver,
  type SQLocalDriver,
  SQLocalProcessor
} from 'sqlocal'

export type FromWorker =
  | { database: ArrayBuffer; slowreader: 'database' }
  | { error: string; slowreader: 'dumpError' | 'noDb' }
  | { slowreader: 'reload' | 'secondTab' }

export type ToWorker = { slowreader: 'dump' }

function send(message: FromWorker, transfer: Transferable[] = []): void {
  postMessage(message, { transfer })
}

function report(error: unknown): never {
  send({ error: String(error), slowreader: 'noDb' })
  throw error
}

let driver: SQLocalDriver

// The page passes the driver type as the worker’s name
if (self.name === 'opfs') {
  class OpfsDriver extends SQLiteOpfsDriver {
    override init(config: DriverConfig): Promise<void> {
      return super.init(config).catch(report)
    }
  }

  driver = new OpfsDriver()
} else {
  let LOCK = 'slowreader:sahpool'
  let single = new Promise<boolean>(resolve => {
    if (!navigator.locks) {
      resolve(true)
      return
    }
    void navigator.locks.request(LOCK, { ifAvailable: true }, async lock => {
      resolve(lock !== null)
      if (lock) return new Promise(() => {})
      send({ slowreader: 'secondTab' })
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

      try {
        this.sqlite3InitModule ??= (
          await import('@sqlite.org/sqlite-wasm')
        ).default
        this.sqlite3 ??= await this.sqlite3InitModule()

        // The pool keeps a file open for every slot: one for the database,
        // one for its journal, the rest for the temporary files of big queries
        let pool = await this.sqlite3.installOpfsSAHPoolVfs({
          initialCapacity: 6
        })
        this.pool = pool

        if (this.db) await this.destroy()
        await importDemo(pool, databasePath)
        this.db = new pool.OpfsSAHPoolDb(databasePath)
        this.config = config
        this.initWriteHook()
      } catch (error) {
        report(error)
      }
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

  driver = new SahpoolDriver()
}

let processor = new SQLocalProcessor(driver)

async function dumpDatabase(): Promise<void> {
  try {
    let { data } = await driver.export()
    let buffer = data instanceof Uint8Array ? data.buffer : data
    send({ database: buffer, slowreader: 'database' }, [buffer])
  } catch (error) {
    send({ error: String(error), slowreader: 'dumpError' })
  }
}

// `onmessage` of the processor is SQLocal’s own callback, not a DOM handler
Object.assign(processor, {
  onmessage(message, transfer) {
    postMessage(message, { transfer })
  }
} satisfies Pick<typeof processor, 'onmessage'>)

addEventListener('message', event => {
  let message = event.data as { slowreader?: undefined } | ToWorker
  if (message.slowreader === 'dump') {
    void dumpDatabase()
  } else {
    void processor.postMessage(event)
  }
})
