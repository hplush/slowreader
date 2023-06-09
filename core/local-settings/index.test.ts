import {
  cleanTestStorage,
  getTestStorage,
  setTestStorageKey,
  useTestStorageEngine
} from '@nanostores/persistent'
import { cleanStores } from 'nanostores'
import { test } from 'uvu'
import { equal } from 'uvu/assert'

import {
  generateCredentials,
  localSettings,
  type LocalSettingsValue,
  signOut
} from '../index.js'

test.before(() => {
  useTestStorageEngine()
})

test.after.each(() => {
  cleanStores(localSettings)
  cleanTestStorage()
})

function getStorageKey(key: keyof LocalSettingsValue): string | undefined {
  return getTestStorage()['slowreader:' + key]
}

test('is empty from start', () => {
  localSettings.listen(() => {})
  equal(localSettings.get(), {})
})

test('loads data from storage', () => {
  setTestStorageKey('slowreader:userId', '10')
  localSettings.listen(() => {})
  equal(localSettings.get(), {
    userId: '10'
  })
})

test('generates user data', () => {
  localSettings.listen(() => {})
  generateCredentials()
  equal(typeof localSettings.get().userId, 'string')
  equal(getStorageKey('userId'), localSettings.get().userId)
})

test('signes out', async () => {
  setTestStorageKey('slowreader:userId', '10')
  localSettings.listen(() => {})
  signOut()
  equal(localSettings.get(), {})
  equal(getTestStorage(), {})
})

test.run()
