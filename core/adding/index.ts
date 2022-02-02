import { sources, findSource, SourceName } from '../sources/index.js'

export function getSourceFromUrl(dirtyUrl: string): SourceName | 'unknown' {
  return findSource(i => i.isMineUrl(dirtyUrl)) || 'unknown'
}

export function normalizeUrl(dirtyUrl: string): URL | 'empty' | 'invalid' {
  let trimmed = dirtyUrl.trim()
  if (trimmed === '') return 'empty'

  let withProtocol: string
  if (!trimmed.includes(':')) {
    let source = getSourceFromUrl(trimmed)
    if (source === 'unknown' || !sources[source].alwaysUseHttps) {
      withProtocol = 'http://' + trimmed
    } else {
      withProtocol = 'https://' + trimmed
    }
  } else if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    withProtocol = trimmed
  } else {
    return 'invalid'
  }

  try {
    return new URL(withProtocol)
  } catch {
    return 'invalid'
  }
}
