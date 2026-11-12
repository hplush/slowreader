// TDLib, Telegram’s own library, compiled to WebAssembly in our
// @hplush/tdlib package. It has access to the whole Telegram account,
// so it lives in own worker, which nginx.conf allows to connect only to us
// and Telegram.

import glue from '@hplush/tdlib/td_wasm.js?url'
import wasm from '@hplush/tdlib/td_wasm.wasm?url'

interface EmscriptenFs {
  close(stream: object): void
  mkdir(path: string): void
  mount(type: object, options: object, path: string): void
  open(path: string, flags: string): object
  read(
    stream: object,
    buffer: Uint8Array,
    offset: number,
    length: number,
    position: number
  ): number
  syncfs(populate: boolean, callback: (error: unknown) => void): void
}

interface Tdlib {
  cwrap(
    name: string,
    returns: 'number',
    args: string[]
  ): (...args: (number | string)[]) => number
  cwrap(
    name: string,
    returns: 'string',
    args: string[]
  ): (...args: (number | string)[]) => string
  cwrap(
    name: string,
    returns: null,
    args: string[]
  ): (...args: (number | string)[]) => void
  FS: EmscriptenFs
  IDBFS: object
  websocket: { on(event: string, callback: () => void): void }
}

export type ToTelegramWorker =
  | { count: number; id: number; offset: number; path: string; type: 'read' }
  | { database: string; type: 'start' }
  | { json: string; type: 'send' }

export type FromTelegramWorker =
  | { data: ArrayBuffer; id: number; type: 'file' }
  | { error: string; id: number; type: 'fileError' }
  | { error: string; type: 'crash' }
  | { json: string; type: 'receive' }
  | { type: 'closed' }
  | { type: 'started' }

function post(
  message: FromTelegramWorker,
  transfer: Transferable[] = []
): void {
  postMessage(message, { transfer })
}

async function load(): Promise<(message: ToTelegramWorker) => void> {
  let { default: createTdlib } = (await import(/* @vite-ignore */ glue)) as {
    default(options: { locateFile(): string }): Promise<Tdlib>
  }
  let td = await createTdlib({ locateFile: () => wasm })

  let send = td.cwrap('td_emscripten_send', null, ['number', 'string'])
  let receive = td.cwrap('td_emscripten_receive', 'string', [])
  let getTimeout = td.cwrap('td_emscripten_get_timeout', 'number', [])

  td.cwrap('td_emscripten_execute', 'string', ['string'])(
    JSON.stringify({
      '@type': 'setLogVerbosityLevel',
      'new_verbosity_level': import.meta.env.DEV ? 2 : 0
    })
  )

  let saving = Promise.resolve()

  /**
   * TDLib writes its database to memory. Emscripten copies it to IndexedDB
   * only on our request, so the session key is lost without it.
   */
  function save(): Promise<void> {
    saving = saving.then(
      () =>
        new Promise(resolve => {
          td.FS.syncfs(false, () => {
            resolve()
          })
        })
    )
    return saving
  }

  let client: number | undefined
  let timer: ReturnType<typeof setTimeout> | undefined

  function receiveAll(): void {
    clearTimeout(timer)
    let closed = false
    let json = receive()
    while (json) {
      post({ json, type: 'receive' })
      if (json.includes('"authorizationStateReady"')) void save()
      if (json.includes('"authorizationStateClosed"')) closed = true
      json = receive()
    }
    if (closed) {
      void save().then(() => {
        post({ type: 'closed' })
      })
    } else {
      timer = setTimeout(receiveAll, getTimeout() * 1000)
    }
  }

  function receiveSoon(): void {
    clearTimeout(timer)
    timer = setTimeout(receiveAll, 1)
  }

  for (let event of ['close', 'error', 'message', 'open']) {
    td.websocket.on(event, receiveSoon)
  }

  function read(path: string, offset: number, count: number): ArrayBuffer {
    let stream = td.FS.open(path, 'r')
    try {
      let buffer = new Uint8Array(count)
      let size = td.FS.read(stream, buffer, 0, count, offset)
      return buffer.buffer.slice(0, size)
    } finally {
      td.FS.close(stream)
    }
  }

  return message => {
    if (message.type === 'start') {
      td.FS.mkdir(message.database)
      td.FS.mount(td.IDBFS, {}, message.database)
      td.FS.syncfs(true, () => {
        client = td.cwrap('td_emscripten_create_client_id', 'number', [])()
        setInterval(() => {
          void save()
        }, 5000)
        post({ type: 'started' })
        receiveSoon()
      })
    } else if (message.type === 'send') {
      send(client!, message.json)
      receiveSoon()
    } else {
      try {
        let bytes = read(message.path, message.offset, message.count)
        post({ data: bytes, id: message.id, type: 'file' }, [bytes])
      } catch (e) {
        post({ error: String(e), id: message.id, type: 'fileError' })
      }
    }
  }
}

let loading = load()

// Listener is set before TDLib is loaded to not lose the first message
addEventListener('message', ({ data }: MessageEvent<ToTelegramWorker>) => {
  loading
    .then(process => {
      process(data)
    })
    .catch((e: unknown) => {
      post({ error: String(e), type: 'crash' })
    })
})
