import { sendSignIn, sendSignUp, sendSignOut } from '@slowreader/api'
import { persistentMap } from '@nanostores/persistent'
import { computed } from 'nanostores'
import { nanoid } from 'nanoid'

import { SlowReaderError } from '../slowreader-error/index.js'

export const DEFAULT_URL = 'wss://slowreader.app/'

export type LocalSettingsValue = {
  serverUrl: string
  signedUp: boolean
  userId?: string
  encryptSecret?: string
}

type SettingsStorageValue = Omit<
  LocalSettingsValue,
  'signedUp' | 'serverUrl'
> & {
  serverUrl?: string
  signedUp?: 'yes'
}

let settingsStorage = persistentMap<SettingsStorageValue>('slowreader:', {})

export let localSettings = computed(settingsStorage, storage => ({
  ...storage,
  serverUrl: storage.serverUrl || DEFAULT_URL,
  signedUp: !!storage.signedUp
}))

function setSignedUp(): void {
  settingsStorage.setKey('signedUp', 'yes')
}

let nextAccessSecret: string | undefined
function getAccessSecret(): string {
  if (localSettings.get().signedUp) {
    throw new Error('No way to get access password for existed user')
  }
  if (!nextAccessSecret) {
    nextAccessSecret = nanoid(16)
  }
  return nextAccessSecret
}

export async function signIn(
  userId: string,
  password: string
): Promise<boolean> {
  let passwordParts = password.split(':')
  if (passwordParts.length !== 2) {
    throw new SlowReaderError('wrong-password')
  }
  let [accessSecret, encryptSecret] = passwordParts
  let correct = await sendSignIn(
    localSettings.get().serverUrl,
    userId,
    accessSecret
  )
  if (correct) {
    setSignedUp()
    settingsStorage.setKey('userId', userId)
    settingsStorage.setKey('encryptSecret', encryptSecret)
  }
  return correct
}

export function signOut(): void {
  sendSignOut(localSettings.get().serverUrl)
  settingsStorage.setKey('signedUp', undefined)
  settingsStorage.setKey('userId', undefined)
  settingsStorage.setKey('encryptSecret', undefined)
}

export async function signUp(): Promise<void> {
  let { signedUp, userId, serverUrl } = localSettings.get()
  if (signedUp) {
    throw new Error('User was already signed up')
  }
  if (!userId) {
    throw new Error('Generate credentials first')
  }
  await sendSignUp(serverUrl, userId, getAccessSecret())
  setSignedUp()
  nextAccessSecret = undefined
}

export function generateCredentials(): void {
  settingsStorage.setKey('userId', nanoid(10))
  settingsStorage.setKey('encryptSecret', nanoid(16))
}

export function changeServerUrl(serverUrl: string): void {
  if (localSettings.get().signedUp) {
    throw new Error('Server can’t be changed for existed user')
  }
  settingsStorage.setKey('serverUrl', serverUrl)
}

export function getPassword(): string {
  if (!localSettings.get().encryptSecret) {
    generateCredentials()
  }
  return `${getAccessSecret()}:${localSettings.get().encryptSecret}`
}
