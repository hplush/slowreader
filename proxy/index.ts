import { styleText } from 'node:util'

import { createProxyServer } from './proxy.js'

const PORT = 5284

const IS_PRODUCTION = process.env.mode === 'production'
const PRODUCTION_DOMAIN_SUFFIX = '.slowreader.app'

const proxy = createProxyServer({
  isProduction: IS_PRODUCTION,
  productionDomainSuffix: PRODUCTION_DOMAIN_SUFFIX
})

proxy.listen(PORT, () => {
  process.stdout.write(
    styleText('green', `Proxy server running on port ${PORT}`)
  )
})
