import { styleText } from 'node:util'

import { createProxyServer } from './proxy.ts'

const PORT = process.env.PORT ?? 5284

let allowsFrom: RegExp[]
if (process.env.NODE_ENV !== 'production') {
  allowsFrom = [/^http:\/\/localhost:5173/]
} else if (process.env.STAGING) {
  allowsFrom = [
    /^https:\/\/dev.slowreader.app/,
    /^https:\/\/(preview-\d+---)?staging-web-jfj4bxwwxq-ew.a.run.app/
  ]
} else {
  allowsFrom = [/^https:\/\/slowreader.app/]
}

let proxy = createProxyServer({
  allowsFrom,
  maxSize: 10 * 1024 * 1024,
  timeout: 2500
})

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
