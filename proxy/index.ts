import { styleText } from 'node:util'

import { createProxyServer } from './proxy.js'

const PORT = 5284

let allowsFrom: RegExp[]
if (process.env.NODE_ENV !== 'production') {
  allowsFrom = [/^http:\/\/localhost:5173/]
} else if (process.env.STAGING) {
  allowsFrom = [
    /^https:\/\/dev.slowreader.app/,
    /^https:\/\/(preview-\d+---)?staging-jfj4bxwwxq-ew.a.run.app/
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
  process.stdout.write(
    styleText('green', `Proxy server running on port ${PORT}`)
  )
})
