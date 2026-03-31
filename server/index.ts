import { Server } from '@logux/server'
import { SUBPROTOCOL } from '@slowreader/api'

import { onExit } from './lib/exit.ts'

let server = new Server(
  Server.loadOptions(process, {
    fileUrl: import.meta.url,
    host: '0.0.0.0',
    minSubprotocol: 0,
    port: process.env.PORT,
    subprotocol: SUBPROTOCOL
  })
)

await server.autoloadModules('modules/*.ts')

server.listen().catch((error: unknown) => {
  throw error
})

onExit(() => {
  void server.destroy()
})
