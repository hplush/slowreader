import { cleanStores, getValue } from '@logux/state'
import { jest } from '@jest/globals'

import {
  setLocalSettingsStorage,
  LocalSettingsStorage,
  generateCredentials,
  SlowReaderError,
  changeServerUrl,
  localSettings,
  getPassword,
  signOut,
  signUp,
  signIn
} from '..'

global.fetch = () => Promise.resolve({ ok: true } as Response)

let storage: { [key in string]?: string }
let storageListener: (key: string, value: string | undefined) => void = () => {}

let testStorage: LocalSettingsStorage = {
  get (key) {
    return storage[key]
  },
  set (key, value) {
    storage[key] = value
  },
  delete (key) {
    delete storage[key]
  },
  subscribe (callback) {
    storageListener = callback
    return () => {
      storageListener = () => {}
    }
  }
}

beforeEach(() => {
  storage = {}
  setLocalSettingsStorage(testStorage)
  jest.spyOn(global, 'fetch')
})

afterEach(() => {
  jest.clearAllMocks()
  storageListener = () => {}
  cleanStores(localSettings)
})

it('is empty from start', () => {
  localSettings.listen(() => {})
  expect(getValue(localSettings)).toEqual({
    serverUrl: 'wss://slowreader.app/',
    signedUp: false,
    userId: undefined,
    encryptSecret: undefined
  })
})

it('loads data from storage', () => {
  storage = {
    serverUrl: 'ws://localhost/',
    signedUp: '1',
    userId: '10',
    encryptSecret: 'secret'
  }
  localSettings.listen(() => {})
  expect(getValue(localSettings)).toEqual({
    serverUrl: 'ws://localhost/',
    signedUp: true,
    userId: '10',
    encryptSecret: 'secret'
  })
})

it('listens for changes', () => {
  localSettings.listen(() => {})

  storageListener('serverUrl', 'ws://localhost/')
  storageListener('signedUp', '1')
  expect(getValue(localSettings).serverUrl).toEqual('ws://localhost/')
  expect(getValue(localSettings).signedUp).toBe(true)
})

it('ignores unkown key changes', () => {
  localSettings.listen(() => {})
  storageListener('unknown', '1')
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
  expect(storage.userId).toEqual(getValue(localSettings).userId)
  expect(storage.encryptSecret).toEqual(getValue(localSettings).encryptSecret)
})

it('generates user data on password access', () => {
  localSettings.listen(() => {})
  let password = getPassword()
  expect(typeof getValue(localSettings).userId).toEqual('string')
  expect(typeof getValue(localSettings).encryptSecret).toEqual('string')
  expect(password).toContain(getValue(localSettings).encryptSecret)
})

it('does not allow to see password after signing up', () => {
  storage = {
    signedUp: '1'
  }
  expect(() => {
    getPassword()
  }).toThrow('No way to get access password for existed user')
})

it('changes server URL', () => {
  localSettings.listen(() => {})
  changeServerUrl('ws://localhost/')
  expect(getValue(localSettings).serverUrl).toEqual('ws://localhost/')
  expect(storage.serverUrl).toEqual('ws://localhost/')
})

it('does not allow to change server URL after signing up', () => {
  storage = {
    signedUp: '1'
  }
  expect(() => {
    changeServerUrl('ws://localhost/')
  }).toThrow('Server can’t be changed for existed user')
})

it('signes out', async () => {
  storage = {
    serverUrl: 'ws://localhost/',
    signedUp: '1',
    userId: '10',
    encryptSecret: 'secret'
  }
  localSettings.listen(() => {})
  signOut()
  expect(fetch).toHaveBeenCalledWith('http://localhost/token', {
    method: 'DELETE',
    body: undefined
  })
  expect(getValue(localSettings)).toEqual({
    serverUrl: 'ws://localhost/',
    signedUp: false,
    userId: undefined,
    encryptSecret: undefined
  })
  expect(storage).toEqual({ serverUrl: 'ws://localhost/' })
})

it('does not sign up existed user', async () => {
  storage = {
    signedUp: '1'
  }
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
  expect(storage.signedUp).toBe('1')
  expect(storage.userId).toEqual(userId)
  expect(storage.encryptSecret).toEqual(getValue(localSettings).encryptSecret)
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
  expect(storage.signedUp).toBe('1')
  expect(storage.userId).toEqual('user')
  expect(storage.encryptSecret).toEqual('encrypt')
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
    signedUp: false,
    userId: undefined,
    encryptSecret: undefined
  })
})
