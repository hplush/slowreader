import {
  useTestStorageEngine,
  setTestStorageKey,
  cleanTestStorage,
  getTestStorage
} from '@nanostores/persistent'
import { equal, is, match, ok, throws, type } from 'uvu/assert'
import { cleanStores, getValue } from 'nanostores'
import { mockFetch } from '@slowreader/api'
import { test } from 'uvu'

import {
  generateCredentials,
  LocalSettingsValue,
  SlowReaderError,
  changeServerUrl,
  localSettings,
  getPassword,
  signOut,
  signUp,
  signIn
} from '../index.js'

test.before(() => {
  useTestStorageEngine()
})

let requests: object[] = []

test.before.each(() => {
  requests = mockFetch()
})

test.after.each(() => {
  cleanStores(localSettings)
  cleanTestStorage()
})

function getStorageKey(key: keyof LocalSettingsValue): string | undefined {
  return getTestStorage()['slowreader:' + key]
}

async function rejects(
  cb: () => Promise<unknown>,
  error: Error | string
): Promise<void> {
  let catched: Error | undefined
  try {
    await cb()
  } catch (e) {
    if (e instanceof Error) {
      catched = e
    }
  }
  if (typeof error === 'string') {
    equal(catched?.message, error)
  } else {
    equal(catched, error)
  }
}

test('is empty from start', () => {
  localSettings.listen(() => {})
  equal(getValue(localSettings), {
    serverUrl: 'wss://slowreader.app/',
    signedUp: false
  })
})

test('loads data from storage', () => {
  setTestStorageKey('slowreader:serverUrl', 'ws://localhost/')
  setTestStorageKey('slowreader:signedUp', 'yes')
  setTestStorageKey('slowreader:userId', '10')
  setTestStorageKey('slowreader:encryptSecret', 'secret')
  localSettings.listen(() => {})
  equal(getValue(localSettings), {
    serverUrl: 'ws://localhost/',
    signedUp: true,
    userId: '10',
    encryptSecret: 'secret'
  })
})

test('generates user data', () => {
  localSettings.listen(() => {})
  generateCredentials()
  is(getValue(localSettings).signedUp, false)
  equal(typeof getValue(localSettings).userId, 'string')
  equal(typeof getValue(localSettings).encryptSecret, 'string')
  let password = getPassword()
  match(password, /[\w-]+:[\w-]+/)
  equal(password, getPassword())
  equal(getStorageKey('userId'), getValue(localSettings).userId)
  equal(getStorageKey('encryptSecret'), getValue(localSettings).encryptSecret)
})

test('generates user data on password access', () => {
  localSettings.listen(() => {})
  let password = getPassword()
  type(getValue(localSettings).userId, 'string')
  type(getValue(localSettings).encryptSecret, 'string')
  ok(password.endsWith(getValue(localSettings).encryptSecret!))
})

test('does not allow to see password after signing up', () => {
  setTestStorageKey('slowreader:signedUp', 'yes')
  throws(() => {
    getPassword()
  }, 'No way to get access password for existed user')
})

test('changes server URL', () => {
  localSettings.listen(() => {})
  changeServerUrl('ws://localhost/')
  equal(getValue(localSettings).serverUrl, 'ws://localhost/')
  equal(getStorageKey('serverUrl'), 'ws://localhost/')
})

test('does not allow to change server URL after signing up', () => {
  setTestStorageKey('slowreader:signedUp', 'yes')
  throws(() => {
    changeServerUrl('ws://localhost/')
  }, 'Server can’t be changed for existed user')
})

test('signes out', async () => {
  setTestStorageKey('slowreader:serverUrl', 'ws://localhost/')
  setTestStorageKey('slowreader:signedUp', 'yes')
  setTestStorageKey('slowreader:userId', '10')
  setTestStorageKey('slowreader:encryptSecret', 'secret')
  localSettings.listen(() => {})
  signOut()
  equal(requests, [
    {
      url: 'http://localhost/token',
      method: 'DELETE',
      body: undefined
    }
  ])
  equal(getValue(localSettings), {
    serverUrl: 'ws://localhost/',
    signedUp: false
  })
  equal(getTestStorage(), {
    'slowreader:serverUrl': 'ws://localhost/'
  })
})

test('does not sign up existed user', async () => {
  setTestStorageKey('slowreader:signedUp', 'yes')
  await rejects(() => signUp(), 'User was already signed up')
})

test('does not sign up without user ID', async () => {
  await rejects(() => signUp(), 'Generate credentials first')
})

test('signes up', async () => {
  localSettings.listen(() => {})
  generateCredentials()
  let accessSecret = getPassword().split(':')[0]
  await signUp()
  let userId = getValue(localSettings).userId
  is(getValue(localSettings).signedUp, true)
  type(userId, 'string')
  type(getValue(localSettings).encryptSecret, 'string')
  equal(getStorageKey('signedUp'), 'yes')
  equal(getStorageKey('userId'), userId)
  equal(getStorageKey('encryptSecret'), getValue(localSettings).encryptSecret)
  equal(requests, [
    {
      url: 'https://slowreader.app/users',
      method: 'POST',
      body: `{"userId":"${userId}","accessSecret":"${accessSecret}"}`
    }
  ])
})

test('checks password while signing in', async () => {
  await rejects(
    () => signIn('user', 'qwerty'),
    new SlowReaderError('wrong-password')
  )
})

test('signs in', async () => {
  localSettings.listen(() => {})
  let result = await signIn('user', 'good:encrypt')
  is(result, true)
  equal(getValue(localSettings), {
    serverUrl: 'wss://slowreader.app/',
    signedUp: true,
    userId: 'user',
    encryptSecret: 'encrypt'
  })
  equal(getStorageKey('signedUp'), 'yes')
  equal(getStorageKey('userId'), 'user')
  equal(getStorageKey('encryptSecret'), 'encrypt')
  equal(requests, [
    {
      url: 'https://slowreader.app/token',
      method: 'PUT',
      body: `{"userId":"user","accessSecret":"good"}`
    }
  ])
})

test('reacts on wrong password during signing in', async () => {
  mockFetch(400)
  localSettings.listen(() => {})
  let result = await signIn('user', 'bad:encrypt')
  is(result, false)
  equal(getValue(localSettings), {
    serverUrl: 'wss://slowreader.app/',
    signedUp: false
  })
})

test.run()
