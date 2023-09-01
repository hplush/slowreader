import { persistentAtom } from '@nanostores/persistent'
import { nanoid } from 'nanoid'

export const userId = persistentAtom<string | undefined>('slowreader:userId')

export function signOut(): void {
  userId.set(undefined)
}

export function generateCredentials(): void {
  userId.set(nanoid(10))
}
