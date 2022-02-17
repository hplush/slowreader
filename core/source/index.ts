import { Resource } from '../resource/index.js'

export interface Source {
  alwaysUseHttps: boolean
  isMineUrl(dirtyUrl: Resource): boolean
}
