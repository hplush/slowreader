import { createServer } from 'node:http'
import { setDefaultAutoSelectFamilyAttemptTimeout } from 'node:net'
import { styleText } from 'node:util'

import { createProxy, DEFAULT_PROXY_CONFIG } from './index.ts'

// Node.js gives every IP address only 500 ms to connect and gives up on all
// of them. Slow websites need more time than browsers’ default.
setDefaultAutoSelectFamilyAttemptTimeout(2000)

if (!process.env.PROXY_ORIGIN) {
  process.stderr.write(
    styleText('red', 'Set PROXY_ORIGIN environment variable\n')
  )
  process.exit(1)
}

let proxy = createServer(
  createProxy({ ...DEFAULT_PROXY_CONFIG, allowsFrom: process.env.PROXY_ORIGIN })
)
proxy.listen(process.env.PORT ?? '5284')

process.on('SIGINT', () => {
  proxy.close()
  process.exit(0)
})
