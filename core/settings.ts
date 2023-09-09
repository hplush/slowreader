import { persistentAtom } from '@nanostores/persistent'
import { nanoid } from 'nanoid'

export const userId = persistentAtom<string | undefined>('slowreader:userId')

export function signOut(): void {
  userId.set(undefined)
}

export function generateCredentials(): void {
  userId.set(nanoid(10))
}

export const theme = persistentAtom<'dark' | 'light' | 'system'>(
  'slowreader:theme',
  'system'
)

export const preloadImages = persistentAtom<'always' | 'free' | 'never'>(
  'slowreader:preloadImages',
  'always'
)
