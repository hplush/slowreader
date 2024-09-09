import { createServer } from 'node:http'
import { styleText } from 'node:util'

import { createProxy, DEFAULT_PROXY_CONFIG } from './index.ts'

const PORT = process.env.PORT ?? 5284

let allowsFrom: string | undefined
if (process.env.NODE_ENV !== 'production') {
  allowsFrom = '^http:\\/\\/localhost:5173'
} else if (process.env.STAGING) {
  allowsFrom = process.env.PROXY_ORIGIN
}

if (!allowsFrom) {
  process.stderr.write(
    styleText('red', 'Set PROXY_ORIGIN environment variable\n')
  )
  process.exit(0)
}

let proxy = createServer(createProxy({ ...DEFAULT_PROXY_CONFIG, allowsFrom }))

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
