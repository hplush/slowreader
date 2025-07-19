import { persistentAtom } from '@nanostores/persistent'
import type { StoreValue } from 'nanostores'

export const userId = persistentAtom<string | undefined>('slowreader:userId')

export const encryptionKey = persistentAtom<string | undefined>(
  'slowreader:encryptionKey'
)

export const syncServer = persistentAtom<string | undefined>(
  'slowreader:server'
)

export const hasPassword = persistentAtom('slowreader:has-password', false, {
  /* c8 ignore next 6 */
  decode(str) {
    return str === 'yes'
  },
  encode(value) {
    return value ? 'yes' : undefined
  }
})

export type Theme = 'dark' | 'light' | 'system'

export const theme = persistentAtom<'dark' | 'light' | 'system'>(
  'slowreader:theme',
  'system'
)

export const preloadImages = persistentAtom<'always' | 'free' | 'never'>(
  'slowreader:preloadImages',
  'always'
)

export interface Settings {
  preloadImages: StoreValue<typeof preloadImages>
  theme: StoreValue<typeof theme>
}
