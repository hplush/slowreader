import { Server } from '@logux/server'

const server = new Server(
  Server.loadOptions(process, {
    fileUrl: import.meta.url,
    subprotocol: '1.0.0',
    supports: '1.x'
  })
)

await server.autoloadModules('modules/*.ts')

server.listen()
