import { styleText } from 'node:util'

import { createProxyServer } from './proxy.js'

const PORT = 5284

let proxy = createProxyServer({
  allowsFrom:
    process.env.NODE_ENV === 'production' ? 'slowreader.app' : 'localhost:5173'
})

proxy.listen(PORT, () => {
  process.stdout.write(
    styleText('green', `Proxy server running on port ${PORT}`)
  )
})
