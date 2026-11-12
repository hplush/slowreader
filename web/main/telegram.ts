// Page side of TDLib, Telegram’s own library, which runs in own worker.
// Only one tab can run TDLib on the account’s database, so the tab holds
// a Web Lock while TDLib is running and stops it when another tab waits.

import {
  type TelegramClient,
  TelegramError,
  type TelegramObject,
  type TelegramOptions
} from '@slowreader/core'

import type { FromTelegramWorker, ToTelegramWorker } from './telegram-worker.ts'

const DATABASE_PREFIX = '/slowreader-telegram-'

interface Waiter<Result> {
  reject(error: Error): void
  resolve(result: Result): void
}

interface Tdlib {
  busy(): boolean
  read(path: string, offset: number, count: number): Promise<ArrayBuffer>
  send(request: TelegramObject): Promise<TelegramObject>
  stop(): Promise<void>
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function runTdlib(
  database: string,
  onUpdate: (update: TelegramObject) => void,
  onStop: () => void
): Promise<Tdlib> {
  let worker = new Worker(new URL('./telegram-worker.ts', import.meta.url), {
    type: 'module'
  })
  let lastId = 0
  let requests = new Map<number, Waiter<TelegramObject>>()
  let files = new Map<number, Waiter<ArrayBuffer>>()
  let stopped: (() => void) | undefined

  function post(message: ToTelegramWorker): void {
    worker.postMessage(message)
  }

  function finish(error: Error): void {
    worker.terminate()
    for (let waiter of [...requests.values(), ...files.values()]) {
      waiter.reject(error)
    }
    requests.clear()
    files.clear()
    onStop()
    stopped?.()
  }

  let tdlib: Tdlib = {
    busy() {
      return requests.size > 0 || files.size > 0
    },
    read(path, offset, count) {
      return new Promise((resolve, reject) => {
        let id = ++lastId
        files.set(id, { reject, resolve })
        post({ count, id, offset, path, type: 'read' })
      })
    },
    send(request) {
      return new Promise((resolve, reject) => {
        let id = ++lastId
        requests.set(id, { reject, resolve })
        post({
          json: JSON.stringify({ ...request, '@extra': id }),
          type: 'send'
        })
      })
    },
    stop() {
      return new Promise(resolve => {
        stopped = resolve
        tdlib.send({ '@type': 'close' }).catch(() => {})
      })
    }
  }

  return new Promise((resolve, reject) => {
    worker.addEventListener('error', event => {
      let error = new Error(event.message)
      reject(error)
      finish(error)
    })
    worker.addEventListener(
      'message',
      ({ data }: MessageEvent<FromTelegramWorker>) => {
        if (data.type === 'started') {
          resolve(tdlib)
        } else if (data.type === 'receive') {
          let object: unknown = JSON.parse(data.json)
          if (!isObject(object) || typeof object['@type'] !== 'string') return
          let { '@extra': id, ...rest } = object
          // Environment gives one client per database
          delete rest['@client_id']
          let answer = { ...rest, '@type': object['@type'] }
          let waiter = requests.get(id as number)
          if (!waiter) {
            onUpdate(answer)
          } else {
            requests.delete(id as number)
            if (answer['@type'] === 'error') {
              waiter.reject(
                new TelegramError(Number(rest.code), String(rest.message))
              )
            } else {
              waiter.resolve(answer)
            }
          }
        } else if (data.type === 'file') {
          files.get(data.id)?.resolve(data.data)
          files.delete(data.id)
        } else if (data.type === 'fileError') {
          files.get(data.id)?.reject(new Error(data.error))
          files.delete(data.id)
        } else if (data.type === 'closed') {
          finish(new TelegramError(500, 'Request aborted'))
        } else {
          let error = new Error(data.error)
          reject(error)
          finish(error)
        }
      }
    )
    post({ database, type: 'start' })
  })
}

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let request = indexedDB.deleteDatabase(name)
    request.addEventListener('success', () => {
      resolve()
    })
    request.addEventListener('error', () => {
      reject(request.error ?? new Error('IndexedDB error'))
    })
  })
}

/**
 * Sessions keys of all Telegram accounts are in these databases.
 */
export async function deleteTelegramDatabases(): Promise<void> {
  let databases = await indexedDB.databases()
  await Promise.all(
    databases
      .filter(i => i.name?.startsWith(DATABASE_PREFIX))
      .map(i => deleteDatabase(i.name!))
  )
}

export function createTelegram(options: TelegramOptions): TelegramClient {
  let database = DATABASE_PREFIX + options.name
  let listeners = new Set<(update: TelegramObject) => void>()
  let running: Promise<Tdlib> | undefined
  let wanted = false
  let idle: ReturnType<typeof setTimeout> | undefined

  let tabs = new BroadcastChannel(database)

  async function stop(): Promise<void> {
    let current = running
    running = undefined
    wanted = false
    let tdlib = await current?.catch(() => undefined)
    await tdlib?.stop()
  }

  /**
   * Another tab can need TDLib for a few requests, like to show a video.
   * This tab frees it between own requests and takes it back by the next one.
   */
  function freeForOtherTab(tdlib: Tdlib): void {
    clearTimeout(idle)
    idle = setTimeout(() => {
      if (wanted && !tdlib.busy()) void stop()
    }, 1000)
  }

  tabs.addEventListener('message', () => {
    if (!running) return
    wanted = true
    void running.then(freeForOtherTab, () => {})
  })

  async function sendParameters(tdlib: Tdlib): Promise<void> {
    try {
      await tdlib.send({
        '@type': 'setTdlibParameters',
        'api_hash': options.apiHash,
        'api_id': options.apiId,
        'application_version': '1',
        'database_directory': database,
        'device_model': 'Slow Reader',
        'files_directory': '/files',
        'system_language_code': 'en',
        'system_version': 'Web',
        'use_chat_info_database': false,
        'use_file_database': false,
        'use_message_database': false,
        'use_secret_chats': false,
        'use_test_dc': import.meta.env.DEV
      })
    } catch (e) {
      await tdlib.stop()
      throw e
    }
  }

  function start(): Promise<Tdlib> {
    tabs.postMessage('wait')
    let starting = new Promise<Tdlib>((resolve, reject) => {
      void navigator.locks.request(database, () => {
        return new Promise<void>(unlock => {
          runTdlib(
            database,
            update => {
              for (let listener of listeners) listener(update)
            },
            () => {
              // TDLib also stops by itself, like after the sign out
              if (running === starting) running = undefined
              unlock()
            }
          )
            .then(async tdlib => {
              await sendParameters(tdlib)
              return tdlib
            })
            .then(resolve, reject)
        })
      })
    })
    return starting
  }

  async function send(request: TelegramObject): Promise<TelegramObject> {
    running ??= start()
    let tdlib = await running
    try {
      return await tdlib.send(request)
    } finally {
      if (wanted) freeForOtherTab(tdlib)
    }
  }

  return {
    close: stop,
    async destroy() {
      await stop()
      tabs.postMessage('wait')
      await navigator.locks.request(database, () => deleteDatabase(database))
    },
    onUpdate(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    async readFile(fileId, offset, count) {
      let file = await send({ '@type': 'getFile', 'file_id': fileId })
      let local = file.local
      if (!isObject(local) || typeof local.path !== 'string') {
        throw new Error('Telegram file is not downloaded')
      }
      let tdlib = await (running ??= start())
      return new Blob([await tdlib.read(local.path, offset, count)])
    },
    send
  }
}
