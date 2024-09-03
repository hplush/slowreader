import { createServer } from 'node:http'
import { styleText } from 'node:util'

import { createProxy, DEFAULT_PROXY_CONFIG } from './index.ts'

const PORT = process.env.PORT ?? 5284

let allowsFrom: string
if (process.env.NODE_ENV !== 'production') {
  allowsFrom = '^http:\\/\\/localhost:5173'
} else if (process.env.STAGING) {
  allowsFrom =
    '^https:\\/\\/dev.slowreader.app' +
    '|https:\\/\\/(preview-\\d+---)?staging-web-jfj4bxwwxq-ew.a.run.app'
} else {
  allowsFrom = '^https:\\/\\/slowreader.app'
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
