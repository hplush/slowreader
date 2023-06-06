import type { PreviewUrl } from '../preview/url/index.js'

export interface Source {
  isMineUrl(url: PreviewUrl): boolean | undefined
}
