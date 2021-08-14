import {
  useTestStorageEngine,
  setTestStorageKey,
  cleanTestStorage,
  getTestStorage
} from '@nanostores/persistent'
import { cleanStores, getValue } from 'nanostores'
import { jest } from '@jest/globals'

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
} from '..'

global.fetch = () => Promise.resolve({ ok: true } as Response)

function getStorageKey(key: keyof LocalSettingsValue): string | undefined {
  return getTestStorage()['slowreader:' + key]
}

beforeAll(() => {
  useTestStorageEngine()
})

beforeEach(() => {
  jest.spyOn(global, 'fetch')
})

afterEach(() => {
  jest.clearAllMocks()
  cleanStores(localSettings)
  cleanTestStorage()
})

it('is empty from start', () => {
  localSettings.listen(() => {})
  expect(getValue(localSettings)).toEqual({
    serverUrl: 'wss://slowreader.app/',
    signedUp: false
  })
})

it('loads data from storage', () => {
  setTestStorageKey('slowreader:serverUrl', 'ws://localhost/')
  setTestStorageKey('slowreader:signedUp', 'yes')
  setTestStorageKey('slowreader:userId', '10')
  setTestStorageKey('slowreader:encryptSecret', 'secret')
  localSettings.listen(() => {})
  expect(getValue(localSettings)).toEqual({
    serverUrl: 'ws://localhost/',
    signedUp: true,
    userId: '10',
    encryptSecret: 'secret'
  })
})

it('generates user data', () => {
  localSettings.listen(() => {})
  generateCredentials()
  expect(getValue(localSettings).signedUp).toBe(false)
  expect(typeof getValue(localSettings).userId).toEqual('string')
  expect(typeof getValue(localSettings).encryptSecret).toEqual('string')
  let password = getPassword()
  expect(password).toMatch(/[\w-]+:[\w-]+/)
  expect(password).toEqual(getPassword())
  expect(getStorageKey('userId')).toEqual(getValue(localSettings).userId)
  expect(getStorageKey('encryptSecret')).toEqual(
    getValue(localSettings).encryptSecret
  )
})

it('generates user data on password access', () => {
  localSettings.listen(() => {})
  let password = getPassword()
  expect(typeof getValue(localSettings).userId).toEqual('string')
  expect(typeof getValue(localSettings).encryptSecret).toEqual('string')
  expect(password).toContain(getValue(localSettings).encryptSecret)
})

it('does not allow to see password after signing up', () => {
  setTestStorageKey('slowreader:signedUp', 'yes')
  expect(() => {
    getPassword()
  }).toThrow('No way to get access password for existed user')
})

it('changes server URL', () => {
  localSettings.listen(() => {})
  changeServerUrl('ws://localhost/')
  expect(getValue(localSettings).serverUrl).toEqual('ws://localhost/')
  expect(getStorageKey('serverUrl')).toEqual('ws://localhost/')
})

it('does not allow to change server URL after signing up', () => {
  setTestStorageKey('slowreader:signedUp', 'yes')
  expect(() => {
    changeServerUrl('ws://localhost/')
  }).toThrow('Server can’t be changed for existed user')
})

it('signes out', async () => {
  setTestStorageKey('slowreader:serverUrl', 'ws://localhost/')
  setTestStorageKey('slowreader:signedUp', 'yes')
  setTestStorageKey('slowreader:userId', '10')
  setTestStorageKey('slowreader:encryptSecret', 'secret')
  localSettings.listen(() => {})
  signOut()
  expect(fetch).toHaveBeenCalledWith('http://localhost/token', {
    method: 'DELETE',
    body: undefined
  })
  expect(getValue(localSettings)).toEqual({
    serverUrl: 'ws://localhost/',
    signedUp: false
  })
  expect(getTestStorage()).toEqual({
    'slowreader:serverUrl': 'ws://localhost/'
  })
})

it('does not sign up existed user', async () => {
  setTestStorageKey('slowreader:signedUp', 'yes')
  await expect(signUp()).rejects.toThrow('User was already signed up')
})

it('does not sign up without user ID', async () => {
  await expect(signUp()).rejects.toThrow('Generate credentials first')
})

it('signes up', async () => {
  localSettings.listen(() => {})
  generateCredentials()
  let accessSecret = getPassword().split(':')[0]
  await signUp()
  let userId = getValue(localSettings).userId
  expect(getValue(localSettings).signedUp).toBe(true)
  expect(typeof userId).toEqual('string')
  expect(typeof getValue(localSettings).encryptSecret).toEqual('string')
  expect(getStorageKey('signedUp')).toBe('yes')
  expect(getStorageKey('userId')).toEqual(userId)
  expect(getStorageKey('encryptSecret')).toEqual(
    getValue(localSettings).encryptSecret
  )
  expect(fetch).toHaveBeenCalledWith('https://slowreader.app/users', {
    method: 'POST',
    body: `{"userId":"${userId}","accessSecret":"${accessSecret}"}`
  })
})

it('checks password while signing in', async () => {
  await expect(signIn('user', 'qwerty')).rejects.toThrow(
    new SlowReaderError('wrong-password')
  )
})

it('signs in', async () => {
  localSettings.listen(() => {})
  let result = await signIn('user', 'good:encrypt')
  expect(result).toBe(true)
  expect(getValue(localSettings)).toEqual({
    serverUrl: 'wss://slowreader.app/',
    signedUp: true,
    userId: 'user',
    encryptSecret: 'encrypt'
  })
  expect(getStorageKey('signedUp')).toBe('yes')
  expect(getStorageKey('userId')).toEqual('user')
  expect(getStorageKey('encryptSecret')).toEqual('encrypt')
  expect(fetch).toHaveBeenCalledWith('https://slowreader.app/token', {
    method: 'PUT',
    body: `{"userId":"user","accessSecret":"good"}`
  })
})

it('reacts on wrong password during signing in', async () => {
  jest
    .spyOn(global, 'fetch')
    .mockReturnValue(Promise.resolve({ ok: false, status: 400 } as Response))
  localSettings.listen(() => {})
  let result = await signIn('user', 'bad:encrypt')
  expect(result).toBe(false)
  expect(getValue(localSettings)).toEqual({
    serverUrl: 'wss://slowreader.app/',
    signedUp: false
  })
})
