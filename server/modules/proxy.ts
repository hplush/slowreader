import type { BaseServer } from '@logux/server'
import {
  createProxy,
  DEFAULT_PROXY_CONFIG,
  type ProxyConfig
} from '@slowreader/proxy'

import { config } from '../config.ts'

export default (server: BaseServer, opts: Partial<ProxyConfig> = {}): void => {
  let allowsFrom = config.proxyOrigin ?? opts.allowsFrom
  if (!allowsFrom) return
  server.logger.info('CORS proxy is enabled')

  let proxy = createProxy({
    ...DEFAULT_PROXY_CONFIG,
    ...opts,
    allowsFrom
  })

  server.http((req, res) => {
    if (req.url!.startsWith('/proxy/')) {
      proxy(req, res)
      return true
    } else {
      return false
    }
  })
}
