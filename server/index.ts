import { Server } from '@logux/server'
import { SUBPROTOCOL } from '@slowreader/api'

const server = new Server(
  Server.loadOptions(process, {
    fileUrl: import.meta.url,
    subprotocol: SUBPROTOCOL,
    supports: '1.x'
  })
)

await server.autoloadModules('modules/*.ts')

server.listen()
