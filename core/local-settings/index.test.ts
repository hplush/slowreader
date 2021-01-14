import { cleanStores } from '@logux/state'
import { signOut, signUp, signIn } from '@slowreader/api'

import { SlowReaderError, LocalSettings, PersistentStorage } from '..'

jest.mock('../../api', () => ({
  __esModule: true,
  signOut: jest.fn(),
  signUp: jest.fn(),
  signIn: jest.fn(async (wsUrl, userId, accessSecret) => {
    return accessSecret === 'good'
  })
}))

let storage: { [key in string]?: string }
let storageListener:
  | undefined
  | ((key: string, value: string | undefined) => void)

let testStorage: PersistentStorage = {
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
      storageListener = undefined
    }
  }
}

function privateMethods (obj: any): any {
  return obj
}

afterEach(() => {
  storage = {}
  storageListener = undefined
  LocalSettings.storage = testStorage
  cleanStores(LocalSettings)
})

it('throws on missed storage', () => {
  LocalSettings.storage = undefined
  expect(() => {
    LocalSettings.load()
  }).toThrow(new SlowReaderError('missed-settings-store'))
})

it('is empty from start', () => {
  let settings = LocalSettings.load()
  expect(settings.serverUrl).toEqual('wss://slowreader.app/')
  expect(settings.signedUp).toBe(false)
  expect(settings.userId).toBeUndefined()
  expect(settings.encryptSecret).toBeUndefined()
})

it('loads data from storage', () => {
  storage = {
    serverUrl: 'ws://localhost/',
    signedUp: '1',
    userId: '10',
    encryptSecret: 'secret'
  }
  let settings = LocalSettings.load()
  expect(settings.serverUrl).toEqual('ws://localhost/')
  expect(settings.signedUp).toBe(true)
  expect(settings.userId).toEqual('10')
  expect(settings.encryptSecret).toEqual('secret')
})

it('listens for changes', () => {
  let settings = LocalSettings.load()

  storageListener?.('serverUrl', 'ws://localhost/')
  storageListener?.('signedUp', '1')
  expect(settings.serverUrl).toEqual('ws://localhost/')
  expect(settings.signedUp).toBe(true)

  cleanStores(LocalSettings)
  storageListener?.('serverUrl', 'wss://example.com')
  expect(settings.serverUrl).toEqual('ws://localhost/')
})

it('ignores unkown key changes', () => {
  let settings = LocalSettings.load()
  storageListener?.('unknown', '1')
  expect(privateMethods(settings).unknown).toBeUndefined()
})

it('generates user data', () => {
  let settings = LocalSettings.load()
  settings.generate()
  expect(settings.signedUp).toBe(false)
  expect(typeof settings.userId).toEqual('string')
  expect(typeof settings.encryptSecret).toEqual('string')
  let password = settings.getPassword()
  expect(password).toMatch(/[\w-]+:[\w-]+/)
  expect(password).toEqual(settings.getPassword())
  expect(storage.userId).toEqual(settings.userId)
  expect(storage.encryptSecret).toEqual(settings.encryptSecret)
})

it('generates user data on password access', () => {
  let settings = LocalSettings.load()
  let password = settings.getPassword()
  expect(typeof settings.userId).toEqual('string')
  expect(typeof settings.encryptSecret).toEqual('string')
  expect(password).toContain(settings.encryptSecret)
})

it('does not allow to see password after signing up', () => {
  storage = {
    signedUp: '1'
  }
  let settings = LocalSettings.load()
  expect(() => {
    settings.getPassword()
  }).toThrow('No way to get access password for existed user')
})

it('changes server URL', () => {
  let settings = LocalSettings.load()
  settings.changeServerUrl('ws://localhost/')
  expect(settings.serverUrl).toEqual('ws://localhost/')
  expect(storage.serverUrl).toEqual('ws://localhost/')
})

it('does not allow to change server URL after signing up', () => {
  storage = {
    signedUp: '1'
  }
  let settings = LocalSettings.load()
  expect(() => {
    settings.changeServerUrl('ws://localhost/')
  }).toThrow('Server can’t be changed for existed user')
})

it('signes out', async () => {
  storage = {
    serverUrl: 'ws://localhost/',
    signedUp: '1',
    userId: '10',
    encryptSecret: 'secret'
  }
  let settings = LocalSettings.load()
  settings.signOut()
  expect(signOut).toHaveBeenCalledWith('ws://localhost/')
  expect(settings.serverUrl).toEqual('ws://localhost/')
  expect(settings.signedUp).toBe(false)
  expect(settings.userId).toBeUndefined()
  expect(settings.encryptSecret).toBeUndefined()
  expect(storage).toEqual({ serverUrl: 'ws://localhost/' })
})

it('does not sign up existed user', async () => {
  storage = {
    signedUp: '1'
  }
  let settings = LocalSettings.load()
  await expect(settings.signUp()).rejects.toThrow('User was already signed up')
})

it('does not sign up without user ID', async () => {
  let settings = LocalSettings.load()
  await expect(settings.signUp()).rejects.toThrow('Generate credentials first')
})

it('signes up', async () => {
  let settings = LocalSettings.load()
  settings.generate()
  let password = settings.getPassword()
  await settings.signUp()
  expect(settings.signedUp).toBe(true)
  expect(typeof settings.userId).toEqual('string')
  expect(typeof settings.encryptSecret).toEqual('string')
  expect(storage.signedUp).toBe('1')
  expect(storage.userId).toEqual(settings.userId)
  expect(storage.encryptSecret).toEqual(settings.encryptSecret)
  expect(privateMethods(settings).accessSecret).toBeUndefined()
  expect(signUp).toHaveBeenCalledWith(
    settings.serverUrl,
    settings.userId,
    password.split(':')[0]
  )
})

it('checks password while signing in', async () => {
  let settings = LocalSettings.load()
  await expect(settings.signIn('user', 'qwerty')).rejects.toThrow(
    new SlowReaderError('wrong-password')
  )
})

it('signs in', async () => {
  let settings = LocalSettings.load()
  let result = await settings.signIn('user', 'good:encrypt')
  expect(result).toBe(true)
  expect(settings.signedUp).toBe(true)
  expect(settings.userId).toEqual('user')
  expect(settings.encryptSecret).toEqual('encrypt')
  expect(storage.signedUp).toBe('1')
  expect(storage.userId).toEqual('user')
  expect(storage.encryptSecret).toEqual('encrypt')
  expect(privateMethods(settings).accessSecret).toBeUndefined()
  expect(signIn).toHaveBeenCalledWith(settings.serverUrl, 'user', 'good')
})

it('reacts on wrong password during signing in', async () => {
  let settings = LocalSettings.load()
  let result = await settings.signIn('user', 'bad:encrypt')
  expect(result).toBe(false)
  expect(settings.signedUp).toBe(false)
  expect(settings.userId).toBeUndefined()
  expect(storage.signedUp).toBeUndefined()
})
