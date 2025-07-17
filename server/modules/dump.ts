import type { BaseServer } from '@logux/server'

import { dumpDb } from '../db/index.ts'
import { config } from '../lib/config.ts'

export default (server: BaseServer): void => {
  if (config.db.startsWith('dump:')) {
    server.http('POST', '/dump', async (req, res) => {
      await dumpDb()
      res.end('Saved\n')
    })
  }
}
