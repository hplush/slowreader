import { persistentAtom } from '@nanostores/persistent'
import { nanoid } from 'nanoid'
import type { StoreValue } from 'nanostores'

import { getClient } from './client.ts'
import { getEnvironment } from './environment.ts'

export const userId = persistentAtom<string | undefined>('slowreader:userId')

export async function signOut(): Promise<void> {
  await getClient().clean()
  userId.set(undefined)
  getEnvironment().restartApp()
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

export interface Settings {
  preloadImages: StoreValue<typeof preloadImages>
  theme: StoreValue<typeof theme>
}
