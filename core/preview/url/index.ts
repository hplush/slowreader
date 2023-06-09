import { type SourceName, sources } from '../../sources/index.js'

const ALWAYS_HTTPS = [/^twitter\.com\//]

export type PreviewUrl = {
  url: URL
}

export type DirtyPreviewUrl = 'emptyUrl' | 'invalidUrl' | PreviewUrl

export function createPreviewUrl(dirtyUrl: string): DirtyPreviewUrl {
  let trimmed = dirtyUrl.trim()
  if (trimmed === '') return 'emptyUrl'

  let url: string
  if (!trimmed.includes(':')) {
    if (ALWAYS_HTTPS.some(i => i.test(trimmed))) {
      url = 'https://' + trimmed
    } else {
      url = 'http://' + trimmed
    }
  } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    url = trimmed
  } else {
    return 'invalidUrl'
  }

  try {
    return { url: new URL(url) }
  } catch {
    return 'invalidUrl'
  }
}

export function isValidPreviewUrl(dirty: DirtyPreviewUrl): dirty is PreviewUrl {
  return dirty !== 'emptyUrl' && dirty !== 'invalidUrl'
}

export function getRealSourceFromPreviewUrl(
  dirty: DirtyPreviewUrl
): 'unknown' | SourceName {
  if (!isValidPreviewUrl(dirty)) return 'unknown'

  let names = Object.keys(sources) as SourceName[]
  for (let name of names) {
    if (sources[name].isMineUrl(dirty) === true) {
      return name
    }
  }

  return 'unknown'
}
