import { createResource, checkResource } from '../resource/index.js'
import { findSource, SourceName } from '../sources/index.js'

export function getSourceFromUrl(dirtyUrl: string): SourceName | 'unknown' {
  // eslint-disable-next-line prefer-let/prefer-let
  const resource = createResource(dirtyUrl)
  if (checkResource(resource)) {
    return findSource(i => i.isMineUrl(resource)) || 'unknown'
  } else {
    return 'unknown'
  }
}
