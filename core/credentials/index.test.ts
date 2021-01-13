import { cleanStores } from '@logux/state'
import { signOut, signUp, signIn } from '@slowreader/api'

import {
  SlowReaderError,
  Credentials,
  CredentialsStorage,
  CredentialsKey
} from '../'

jest.mock('../../api', () => ({
  __esModule: true,
  signOut: jest.fn(),
  signUp: jest.fn(),
  signIn: jest.fn(async (wsUrl, userId, accessSecret) => {
    return accessSecret === 'good'
  })
}))

let storage: { [key in CredentialsKey]?: string }
let storageListener:
  | undefined
  | ((key: CredentialsKey, value: string | undefined) => void)

let testStorage: CredentialsStorage = {
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

afterEach(() => {
  storage = {}
  storageListener = undefined
  Credentials.storage = testStorage
  cleanStores(Credentials)
})

it('throws on missed storage', () => {
  Credentials.storage = undefined
  expect(() => {
    Credentials.load()
  }).toThrow(new SlowReaderError('missed-settings-store'))
})

it('is empty from start', () => {
  let credentials = Credentials.load()
  expect(credentials.serverUrl).toEqual('wss://slowreader.app/')
  expect(credentials.signedUp).toBe(false)
  expect(credentials.userId).toBeUndefined()
  expect(credentials.encryptSecret).toBeUndefined()
})

it('loads data from storage', () => {
  storage = {
    serverUrl: 'ws://localhost/',
    signedUp: '1',
    userId: '10',
    encryptSecret: 'secret'
  }
  let credentials = Credentials.load()
  expect(credentials.serverUrl).toEqual('ws://localhost/')
  expect(credentials.signedUp).toBe(true)
  expect(credentials.userId).toEqual('10')
  expect(credentials.encryptSecret).toEqual('secret')
})

it('listens for changes', () => {
  let credentials = Credentials.load()

  storageListener?.('serverUrl', 'ws://localhost/')
  storageListener?.('signedUp', '1')
  expect(credentials.serverUrl).toEqual('ws://localhost/')
  expect(credentials.signedUp).toBe(true)

  cleanStores(Credentials)
  storageListener?.('serverUrl', 'wss://example.com')
  expect(credentials.serverUrl).toEqual('ws://localhost/')
})

it('generates user data', () => {
  let credentials = Credentials.load()
  credentials.generate()
  expect(credentials.signedUp).toBe(false)
  expect(typeof credentials.userId).toEqual('string')
  expect(typeof credentials.encryptSecret).toEqual('string')
  let password = credentials.getPassword()
  expect(password).toMatch(/[\w-]+:[\w-]+/)
  expect(password).toEqual(credentials.getPassword())
  expect(storage.userId).toEqual(credentials.userId)
  expect(storage.encryptSecret).toEqual(credentials.encryptSecret)
})

it('generates user data on password access', () => {
  let credentials = Credentials.load()
  let password = credentials.getPassword()
  expect(typeof credentials.userId).toEqual('string')
  expect(typeof credentials.encryptSecret).toEqual('string')
  expect(password).toContain(credentials.encryptSecret)
})

it('does not allow to see password after signing up', () => {
  storage = {
    signedUp: '1'
  }
  let credentials = Credentials.load()
  expect(() => {
    credentials.getPassword()
  }).toThrow('No way to get access password for existed user')
})

it('changes server URL', () => {
  let credentials = Credentials.load()
  credentials.changeServerUrl('ws://localhost/')
  expect(credentials.serverUrl).toEqual('ws://localhost/')
  expect(storage.serverUrl).toEqual('ws://localhost/')
})

it('does not allow to change server URL after signing up', () => {
  storage = {
    signedUp: '1'
  }
  let credentials = Credentials.load()
  expect(() => {
    credentials.changeServerUrl('ws://localhost/')
  }).toThrow('Server can’t be changed for existed user')
})

it('signes out', async () => {
  storage = {
    serverUrl: 'ws://localhost/',
    signedUp: '1',
    userId: '10',
    encryptSecret: 'secret'
  }
  let credentials = Credentials.load()
  credentials.signOut()
  expect(signOut).toHaveBeenCalledWith('ws://localhost/')
  expect(credentials.serverUrl).toEqual('ws://localhost/')
  expect(credentials.signedUp).toBe(false)
  expect(credentials.userId).toBeUndefined()
  expect(credentials.encryptSecret).toBeUndefined()
  expect(storage).toEqual({ serverUrl: 'ws://localhost/' })
})

it('does not sign up existed user', async () => {
  storage = {
    signedUp: '1'
  }
  let credentials = Credentials.load()
  await expect(credentials.signUp()).rejects.toThrow(
    'User was already signed up'
  )
})

it('does not sign up without user ID', async () => {
  let credentials = Credentials.load()
  await expect(credentials.signUp()).rejects.toThrow(
    'Generate credentials first'
  )
})

it('signes up', async () => {
  let credentials = Credentials.load()
  credentials.generate()
  let password = credentials.getPassword()
  await credentials.signUp()
  expect(credentials.signedUp).toBe(true)
  expect(typeof credentials.userId).toEqual('string')
  expect(typeof credentials.encryptSecret).toEqual('string')
  expect(storage.signedUp).toBe('1')
  expect(storage.userId).toEqual(credentials.userId)
  expect(storage.encryptSecret).toEqual(credentials.encryptSecret)
  expect((credentials as any).accessSecret).toBeUndefined()
  expect(signUp).toHaveBeenCalledWith(
    credentials.serverUrl,
    credentials.userId,
    password.split(':')[0]
  )
})

it('checks password while signing in', async () => {
  let credentials = Credentials.load()
  await expect(credentials.signIn('user', 'qwerty')).rejects.toThrow(
    new SlowReaderError('wrong-password')
  )
})

it('signs in', async () => {
  let credentials = Credentials.load()
  let result = await credentials.signIn('user', 'good:encrypt')
  expect(result).toBe(true)
  expect(credentials.signedUp).toBe(true)
  expect(credentials.userId).toEqual('user')
  expect(credentials.encryptSecret).toEqual('encrypt')
  expect(storage.signedUp).toBe('1')
  expect(storage.userId).toEqual('user')
  expect(storage.encryptSecret).toEqual('encrypt')
  expect((credentials as any).accessSecret).toBeUndefined()
  expect(signIn).toHaveBeenCalledWith(credentials.serverUrl, 'user', 'good')
})

it('reacts on wrong password during signing in', async () => {
  let credentials = Credentials.load()
  let result = await credentials.signIn('user', 'bad:encrypt')
  expect(result).toBe(false)
  expect(credentials.signedUp).toBe(false)
  expect(credentials.userId).toBeUndefined()
  expect(storage.signedUp).toBeUndefined()
})
