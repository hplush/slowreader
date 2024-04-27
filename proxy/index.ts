import { styleText } from 'node:util'

import { createProxyServer } from './proxy.js'

const PORT = 5284

let proxy = createProxyServer({
  isProduction: process.env.NODE_ENV === 'production',
  productionDomainSuffix: '.slowreader.app'
})

proxy.listen(PORT, () => {
  process.stdout.write(
    styleText('green', `Proxy server running on port ${PORT}`)
  )
})
