import { persistentAtom, persistentBoolean } from '@nanostores/persistent'
import { atom, effect, type StoreValue } from 'nanostores'

import type { FillStatistics } from './benchmark.ts'
import { busyDuring } from './busy.ts'
import { onClient } from './client.ts'
import { waitLoading } from './lib/stores.ts'
import { createSyncedSetting, syncSettings } from './lib/synced-setting.ts'
import { commonMessages } from './messages/index.ts'
import { getTables, openedDatabase, type SettingsValue } from './schema.ts'

export const userId = persistentAtom<string | undefined>('slowreader:userId')

/**
 * Non-extractable key, which the environment keeps outside of `localStorage`.
 */
export const encryptionKey = atom<CryptoKey | undefined>()

/**
 * Key loader helper to simplify client's code.
 */
export function waitEncryptionKey(): CryptoKey | Promise<CryptoKey> {
  return (
    encryptionKey.get() ??
    new Promise(resolve => {
      let unbind = encryptionKey.listen(key => {
        if (!key) return
        unbind()
        resolve(key)
      })
    })
  )
}

/**
 * Cloud user must sign in again to unlock the key from the server.
 */
export const encryptionKeyLost = atom(false)

export const syncServer = persistentAtom<string | undefined>(
  'slowreader:server'
)

export const hasCloud = persistentBoolean('slowreader:has-cloud')

/**
 * Account was created with a synced passkey and the user has not created
 * a backup password yet.
 */
export const passkeyOnly = persistentBoolean('slowreader:passkey-only')

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

export type MediaDownload = 'always' | 'free' | 'never'

export const cacheImages = persistentAtom<MediaDownload>(
  'slowreader:cacheImages',
  'always'
)

export const cacheVideos = persistentAtom<MediaDownload>(
  'slowreader:cacheVideos',
  'never'
)

export type MediaReading = 'all' | 'none' | 'slow'

/**
 * Posts of which reading need media offline.
 */
export const cacheMediaReading = persistentAtom<MediaReading>(
  'slowreader:cacheMediaReading',
  'all'
)

/**
 * How to download feeds and files.
 */
export const requestMethod = persistentAtom<'extension' | 'proxy' | undefined>(
  'slowreader:requestMethod'
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

/**
 * Percents of the whole text and UI scale.
 */
export const textSize = persistentAtom<number>('slowreader:textSize', 100, {
  decode: Number,
  encode: String
})

export const POST_FONTS = [
  'default',
  'noto-sans',
  'noto-serif',
  'literata',
  'merriweather',
  'bitter',
  'inter',
  'atkinson',
  'lexend',
  'opendyslexic',
  'system',
  'custom'
] as const

export type PostFont = (typeof POST_FONTS)[number]

export const postFont = persistentAtom<PostFont>(
  'slowreader:postFont',
  'default'
)

export type PostLineHeight = 'compact' | 'normal' | 'relaxed'

export const postLineHeight = persistentAtom<PostLineHeight>(
  'slowreader:postLineHeight',
  'normal'
)

export const customPostFont = persistentAtom<string>(
  'slowreader:customPostFont',
  ''
)

let syncedSetting = createSyncedSetting<SettingsValue>()

export const showSensitiveMedia = syncedSetting('showSensitiveMedia', false)

export const openWarnings = syncedSetting('openWarnings', false)

export const fastPostsMaxAge = syncedSetting('fastPostsMaxAge', 604800)

export const nightLock = syncedSetting('nightLock', {
  enabled: false,
  from: 23,
  to: 7
})

export type NightLock = StoreValue<typeof nightLock>

export const syncedSettingsLoading = atom(true)

onClient(() =>
  effect(openedDatabase, db => {
    if (!db) return
    let unbind = syncSettings(
      getTables().settings,
      'user',
      [fastPostsMaxAge, nightLock, openWarnings, showSensitiveMedia],
      syncedSettingsLoading,
      () => ({ createdAt: Math.round(Date.now() / 1000) })
    )
    void busyDuring(commonMessages.get().loadingData, () =>
      waitLoading(syncedSettingsLoading)
    )
    return unbind
  })
)

export interface Settings {
  customPostFont: StoreValue<typeof customPostFont>
  fastPostsMaxAge: StoreValue<typeof fastPostsMaxAge>
  nightLock: NightLock
  openWarnings: StoreValue<typeof openWarnings>
  postFont: PostFont
  postLineHeight: PostLineHeight
  showSensitiveMedia: StoreValue<typeof showSensitiveMedia>
  textSize: StoreValue<typeof textSize>
  theme: StoreValue<typeof theme>
  useQuietCursor: StoreValue<typeof useQuietCursor>
  useReducedMotion: StoreValue<typeof useReducedMotion>
}
