import type { PreviewUrl } from '../preview/url/index.js'

export interface Source {
  alwaysUseHttps: boolean
  isMineUrl(url: PreviewUrl): boolean
}
