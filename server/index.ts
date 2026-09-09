import { PostgresStore, Server } from '@logux/server'
import { SUBPROTOCOL } from '@slowreader/api'

import { dbDriver } from './db/index.ts'
import { onExit } from './lib/exit.ts'
import type { ClientData } from './lib/types.ts'

let store = new PostgresStore(dbDriver)
await store.init()

let server = new Server<object, ClientData>({
  ...Server.loadOptions(process, {
    fileUrl: import.meta.url,
    host: '0.0.0.0',
    minSubprotocol: 0,
    port: process.env.PORT,
    subprotocol: SUBPROTOCOL
  }),
  store
})

/**
 * Errors like `DrizzleQueryError` keep only the query in the message,
 * while the reason is in `cause`, which the default reporter does not print.
 */
function logCauses(error: Error): void {
  let cause: unknown = error.cause
  while (cause instanceof Error) {
    let details: Record<string, unknown> = { stack: cause.stack }
    for (let [key, value] of Object.entries(cause)) details[key] = value
    server.logger.error(details, cause.message)
    cause = cause.cause
  }
}

server.on('error', logCauses)
server.on('fatal', logCauses)

// Logux Server reports client’s IP on connect, but we do not want to know it
let { info } = server.logger
server.logger.info = (details, ...args) => {
  if (
    typeof details === 'object' &&
    details !== null &&
    'ipAddress' in details
  ) {
    let anonymous: Record<string, unknown> = { ...details }
    delete anonymous.ipAddress
    info(anonymous, ...args)
  } else {
    info(details, ...args)
  }
}

// Assets answer the unknown URLs with the 404 page, so they go last
await server.autoloadModules(['modules/*.ts', '!modules/assets.ts'])
await server.autoloadModules('modules/assets.ts')

server.listen().catch((error: unknown) => {
  throw error
})

onExit(() => {
  void server.destroy()
})
