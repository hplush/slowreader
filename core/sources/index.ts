import type { Source } from '../source/index.js'

import { twitter } from './twitter.js'

export const sources = {
  twitter
}

export type SourceName = keyof typeof sources

// We need this function to avoid TS limit for for-in key types
export function findSource(
  test: (source: Source) => boolean
): SourceName | undefined {
  for (let i in sources) {
    let name = i as SourceName
    if (test(sources[name as SourceName])) return name
  }
  return undefined
}
