import { createResource, isValidResource } from '../resource/index.js'
import { findSource, SourceName } from '../sources/index.js'

export function getSourceFromUrl(dirtyUrl: string): SourceName | 'unknown' {
  // TS guards doesn’t work with `let`
  // eslint-disable-next-line prefer-let/prefer-let
  const resource = createResource(dirtyUrl)
  if (isValidResource(resource)) {
    return findSource(i => i.isMineUrl(resource)) || 'unknown'
  } else {
    return 'unknown'
  }
}
