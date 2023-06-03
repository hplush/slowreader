import { persistentMap } from '@nanostores/persistent'
import { nanoid } from 'nanoid'

export type LocalSettingsValue = {
  userId?: string
}

export let localSettings = persistentMap<LocalSettingsValue>('slowreader:', {})

export function signOut(): void {
  localSettings.setKey('userId', undefined)
}

export function generateCredentials(): void {
  localSettings.setKey('userId', nanoid(10))
}
