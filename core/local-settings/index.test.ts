import {
  cleanTestStorage,
  getTestStorage,
  setTestStorageKey,
  useTestStorageEngine
} from '@nanostores/persistent'
import { cleanStores } from 'nanostores'
import { test } from 'uvu'
import { equal } from 'uvu/assert'

import { generateCredentials, signOut, userId } from '../index.js'

test.before(() => {
  useTestStorageEngine()
})

test.after.each(() => {
  cleanStores(userId)
  cleanTestStorage()
})

function getStorageKey(key: string): string | undefined {
  return getTestStorage()['slowreader:' + key]
}

test('is empty from start', () => {
  userId.listen(() => {})
  equal(userId.get(), undefined)
})

test('loads data from storage', () => {
  setTestStorageKey('slowreader:userId', '10')
  userId.listen(() => {})
  equal(userId.get(), '10')
})

test('generates user data', () => {
  userId.listen(() => {})
  generateCredentials()
  equal(typeof userId.get(), 'string')
  equal(getStorageKey('userId'), userId.get())
})

test('signes out', async () => {
  setTestStorageKey('slowreader:userId', '10')
  userId.listen(() => {})
  signOut()
  equal(userId.get(), undefined)
  equal(getTestStorage(), {})
})

test.run()
