import { persistentAtom, persistentBoolean } from '@nanostores/persistent'
import type { StoreValue } from 'nanostores'

import type { FillStatistics } from './benchmark.ts'

export const userId = persistentAtom<string | undefined>('slowreader:userId')

export const encryptionKey = persistentAtom<string | undefined>(
  'slowreader:encryptionKey'
)

export const syncServer = persistentAtom<string | undefined>(
  'slowreader:server'
)

export const hasPassword = persistentBoolean('slowreader:has-password')

export interface DatabaseFailure {
  at: Date
  error?: string
  reason: string
}

export const lastReset = persistentAtom<DatabaseFailure | undefined>(
  'slowreader:reset',
  undefined,
  {
    decode(value) {
      let json = JSON.parse(value) as DatabaseFailure
      return { ...json, at: new Date(json.at) }
    },
    encode(value) {
      if (!value) return undefined
      return JSON.stringify(value)
    }
  }
)

/**
 * The upload of the local data to the server on the sign-up
 */
export const uploadingLocalData = persistentBoolean('slowreader:uploading')

/**
 * Sign in to the existing account or on the database reset
 */
export const downloadingCloudData = persistentBoolean('slowreader:downloading')

export type Theme = 'dark' | 'light' | 'system'

export const theme = persistentAtom<'dark' | 'light' | 'system'>(
  'slowreader:theme',
  'system'
)

export const preloadImages = persistentAtom<'always' | 'free' | 'never'>(
  'slowreader:preloadImages',
  'always'
)

/**
 * Statistics of the last created benchmark data.
 *
 * It lives here and not in `benchmark.ts`, so that `signOut()` can reset it
 * without loading the whole data generator into the app.
 */
export const benchmarkStatistics = persistentAtom<FillStatistics | undefined>(
  'slowreader:benchmark',
  undefined,
  {
    decode: value => JSON.parse(value) as FillStatistics,
    encode: value => JSON.stringify(value)
  }
)

export const useReducedMotion = persistentBoolean('slowreader:reduced-motion')

export const useQuietCursor = persistentBoolean('slowreader:quiet-cursor')

export interface Settings {
  preloadImages: StoreValue<typeof preloadImages>
  theme: StoreValue<typeof theme>
  useQuietCursor: StoreValue<typeof useQuietCursor>
  useReducedMotion: StoreValue<typeof useReducedMotion>
}
