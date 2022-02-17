export interface Resource {
  url: URL
  contentType?: string
  headers?: Record<string, string>
  body?: string
}

export type DirtyResource = Resource | 'invalidUrl' | 'emptyUrl'

const ALWAYS_HTTPS = [/^twitter\.com\//]

export function createResource(dirtyUrl: string): DirtyResource {
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

export function isValidResource(dirty: DirtyResource): dirty is Resource {
  return dirty !== 'emptyUrl' && dirty !== 'invalidUrl'
}
