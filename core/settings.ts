import { persistentAtom, persistentBoolean } from '@nanostores/persistent'
import type { StoreValue } from 'nanostores'

export const userId = persistentAtom<string | undefined>('slowreader:userId')

export const encryptionKey = persistentAtom<string | undefined>(
  'slowreader:encryptionKey'
)

export const syncServer = persistentAtom<string | undefined>(
  'slowreader:server'
)

export const hasPassword = persistentBoolean('slowreader:has-password')

export type Theme = 'dark' | 'light' | 'system'

export const theme = persistentAtom<'dark' | 'light' | 'system'>(
  'slowreader:theme',
  'system'
)

export const preloadImages = persistentAtom<'always' | 'free' | 'never'>(
  'slowreader:preloadImages',
  'always'
)

export const useReducedMotion = persistentBoolean('slowreader:reduced-motion')

export const useQuietCursor = persistentBoolean('slowreader:quiet-cursor')

export interface Settings {
  preloadImages: StoreValue<typeof preloadImages>
  theme: StoreValue<typeof theme>
  useQuietCursor: StoreValue<typeof useQuietCursor>
  useReducedMotion: StoreValue<typeof useReducedMotion>
}
