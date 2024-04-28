import { styleText } from 'node:util'

import { createProxyServer } from './proxy.js'

const PORT = 5284

let proxy = createProxyServer({
  allowsFrom:
    process.env.NODE_ENV === 'production'
      ? [
          /^https:\/\/dev.slowreader.app/,
          /^https:\/\/(preview-\d+---)?staging-jfj4bxwwxq-ew.a.run.app/
        ]
      : [/^http:\/\/localhost:5173/],
  maxSize: 10 * 1024 * 1024,
  timeout: 2500
})

proxy.listen(PORT, () => {
  process.stdout.write(
    styleText('green', `Proxy server running on port ${PORT}`)
  )
})
