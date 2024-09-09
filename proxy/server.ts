import { createServer } from 'node:http'
import { styleText } from 'node:util'

import { createProxy, DEFAULT_PROXY_CONFIG } from './index.ts'

if (!process.env.PROXY_ORIGIN || !process.env.PORT) {
  process.stderr.write(
    styleText('red', 'Set PROXY_ORIGIN and PORT environment variables\n')
  )
  process.exit(0)
}

let proxy = createServer(
  createProxy({ ...DEFAULT_PROXY_CONFIG, allowsFrom: process.env.PROXY_ORIGIN })
)
proxy.listen(process.env.PORT)

process.on('SIGINT', () => {
  proxy.close()
  process.exit(0)
})
