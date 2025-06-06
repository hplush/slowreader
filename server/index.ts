import { Server } from '@logux/server'
import { SUBPROTOCOL } from '@slowreader/api'

const server = new Server(
  Server.loadOptions(process, {
    fileUrl: import.meta.url,
    host: '0.0.0.0',
    port: process.env.PORT,
    subprotocol: SUBPROTOCOL,
    supports: '0.x'
  })
)

await server.autoloadModules('modules/*.ts')

server.listen().catch((error: unknown) => {
  throw error
})
