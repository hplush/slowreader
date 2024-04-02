import type { BaseServer } from '@logux/server'

export default (server: BaseServer): void => {
  server.auth(() => false)
}
