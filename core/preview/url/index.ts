import { findSource, type SourceName } from '../../sources/index.js'

const ALWAYS_HTTPS = [/^twitter\.com\//]

export type PreviewUrl =
  | {
      url: URL
    }
  | {
      url: URL
      contentType: string
      headers: Record<string, string>
      body: string
    }

export type DirtyPreviewUrl = PreviewUrl | 'invalidUrl' | 'emptyUrl'

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

export function getSourceFromPreviewUrl(
  dirty: DirtyPreviewUrl
): SourceName | 'unknown' {
  if (isValidPreviewUrl(dirty)) {
    return findSource(i => i.isMineUrl(dirty)) || 'unknown'
  } else {
    return 'unknown'
  }
}
