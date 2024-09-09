import { createServer } from 'node:http'
import { styleText } from 'node:util'

import { createProxy, DEFAULT_PROXY_CONFIG } from './index.ts'

const PORT = process.env.PORT ?? 5284

if (!process.env.PROXY_ORIGIN) {
  process.stderr.write(
    styleText('red', 'Set PROXY_ORIGIN environment variable\n')
  )
  process.exit(0)
}

let proxy = createServer(
  createProxy({ ...DEFAULT_PROXY_CONFIG, allowsFrom: process.env.PROXY_ORIGIN })
)

proxy.listen(PORT, () => {
  if (process.env.NODE_ENV !== 'production') {
    process.stdout.write(
      styleText('green', `Proxy server running on port ${PORT}`) + '\n'
    )
  }
})

process.on('SIGINT', () => {
  proxy.close()
  process.exit(0)
})
