import type { SourceName } from '../sources/index.js'
import type { PreviewUrl } from './url/index.js'

export interface PreviewCandidate {
  feedId: string
  name: string
  source: SourceName
}

export interface PreviewValue {
  candidates: PreviewCandidate[]
  isLoading: boolean
  urls: PreviewUrl[]
}

export * from './url/index.js'
