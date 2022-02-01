import { findSource, SourceName } from '../sources/index.js'

export function getSourceFromUrl(url: string): SourceName | 'unknown' {
  return findSource(i => i.isMineUrl(url)) || 'unknown'
}
