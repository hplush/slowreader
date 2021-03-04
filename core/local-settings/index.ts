import { sendSignIn, sendSignUp, sendSignOut } from '@slowreader/api'
import { createMap, getValue } from '@logux/state'
import { nanoid } from 'nanoid'

import { SlowReaderError } from '../slowreader-error'

export interface LocalSettingsStorage {
  get(key: string): string | undefined
  set(key: string, value: string): void
  delete(key: string): void
  subscribe(
    callback: (key: string, value: string | undefined) => void
  ): () => void
}

const KEYS = ['serverUrl', 'signedUp', 'userId', 'encryptSecret']

export const DEFAULT_URL = 'wss://slowreader.app/'

export interface LocalSettingsValue {
  readonly serverUrl: string
  readonly signedUp: boolean
  readonly userId: string | undefined
  readonly encryptSecret: string | undefined
}

let storage: LocalSettingsStorage

export function setLocalSettingsStorage (value: LocalSettingsStorage) {
  storage = value
}

export let localSettings = createMap<LocalSettingsValue>(() => {
  let set = (key: string, value: string | undefined) => {
    if (key === 'serverUrl') {
      localSettings.setKey(key, value ?? DEFAULT_URL)
    } else if (key === 'signedUp') {
      localSettings.setKey(key, !!value)
    } else if (key === 'userId' || key === 'encryptSecret') {
      localSettings.setKey(key, value)
    }
  }
  for (let i of KEYS) set(i, storage.get(i))
  return storage.subscribe(set)
})

function change (key: 'userId' | 'serverUrl' | 'encryptSecret', value: string) {
  localSettings.setKey(key, value)
  storage.set(key, value)
}

function setSignedUp () {
  localSettings.setKey('signedUp', true)
  storage.set('signedUp', '1')
}

let nextAccessSecret: string | undefined
function getAccessSecret (): string {
  if (getValue(localSettings).signedUp) {
    throw new Error('No way to get access password for existed user')
  }
  if (!nextAccessSecret) {
    nextAccessSecret = nanoid(16)
  }
  return nextAccessSecret
}

export async function signIn (userId: string, password: string) {
  let passwordParts = password.split(':')
  if (passwordParts.length !== 2) {
    throw new SlowReaderError('wrong-password')
  }
  let [accessSecret, encryptSecret] = passwordParts
  let correct = await sendSignIn(
    getValue(localSettings).serverUrl,
    userId,
    accessSecret
  )
  if (correct) {
    setSignedUp()
    change('userId', userId)
    change('encryptSecret', encryptSecret)
  }
  return correct
}

export function signOut () {
  sendSignOut(getValue(localSettings).serverUrl)
  localSettings.setKey('signedUp', false)
  storage.delete('signedUp')
  localSettings.setKey('userId', undefined)
  storage.delete('userId')
  localSettings.setKey('encryptSecret', undefined)
  storage.delete('encryptSecret')
}

export async function signUp () {
  let { signedUp, userId, serverUrl } = getValue(localSettings)
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

export function generateCredentials () {
  change('userId', nanoid(10))
  change('encryptSecret', nanoid(16))
}

export function changeServerUrl (serverUrl: string) {
  if (getValue(localSettings).signedUp) {
    throw new Error('Server can’t be changed for existed user')
  }
  change('serverUrl', serverUrl)
}

export function getPassword () {
  if (!getValue(localSettings).encryptSecret) {
    generateCredentials()
  }
  return `${getAccessSecret()}:${getValue(localSettings).encryptSecret}`
}
