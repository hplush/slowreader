import {
  cleanTestStorage,
  getTestStorage,
  setTestStorageKey,
  useTestStorageEngine
} from '@nanostores/persistent'
import { keepMount } from 'nanostores'
import { test } from 'uvu'
import { equal } from 'uvu/assert'

import { generateCredentials, signOut, theme, userId } from '../index.js'

test.before(() => {
  useTestStorageEngine()
})

test.after.each(() => {
  cleanTestStorage()
})

function getStorageKey(key: string): string | undefined {
  return getTestStorage()['slowreader:' + key]
}

test('generates user data', () => {
  keepMount(userId)
  generateCredentials()
  equal(typeof userId.get(), 'string')
  equal(getStorageKey('userId'), userId.get())
})

test('signes out', async () => {
  setTestStorageKey('slowreader:userId', '10')
  keepMount(userId)
  signOut()
  equal(userId.get(), undefined)
  equal(getTestStorage(), {})
})

test('has store for theme', () => {
  equal(theme.get(), 'system')
})

test.run()
