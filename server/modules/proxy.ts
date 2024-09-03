import type { BaseServer } from '@logux/server'
import {
  createProxy,
  DEFAULT_PROXY_CONFIG,
  type ProxyConfig
} from '@slowreader/proxy'

export default (server: BaseServer, opts: Partial<ProxyConfig> = {}): void => {
  let proxy = createProxy({ ...DEFAULT_PROXY_CONFIG, ...opts })
  server.http((req, res) => {
    if (req.url?.startsWith('/proxy/')) {
      proxy(req, res)
      return true
    } else {
      return false
    }
  })
}
