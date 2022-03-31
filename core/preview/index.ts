import { SourceName } from '../sources/index.js'
import { PreviewUrl } from './url/index.js'

export interface PreviewCandidate {
  source: SourceName
  feedId: string
  name: string
}

export interface PreviewValue {
  urls: PreviewUrl[]
  isLoading: boolean
  candidates: PreviewCandidate[]
}

export * from './url/index.js'
