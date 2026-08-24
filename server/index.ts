import { Server } from '@logux/server'
import { SUBPROTOCOL } from '@slowreader/api'

import { onExit } from './lib/exit.ts'
import type { ClientData } from './lib/types.ts'

let server = new Server<object, ClientData>(
  Server.loadOptions(process, {
    fileUrl: import.meta.url,
    host: '0.0.0.0',
    minSubprotocol: 0,
    port: process.env.PORT,
    subprotocol: SUBPROTOCOL
  })
)

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

await server.autoloadModules('modules/*.ts')

server.listen().catch((error: unknown) => {
  throw error
})

onExit(() => {
  void server.destroy()
})
