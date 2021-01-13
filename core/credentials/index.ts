import { LocalStore, change, destroy } from '@logux/state'
import { signIn, signUp, signOut } from '@slowreader/api'
import { nanoid } from 'nanoid'

import { SlowReaderError } from '../slowreader-error'

export type CredentialsKey =
  | 'serverUrl'
  | 'userId'
  | 'encryptSecret'
  | 'signedUp'

export interface CredentialsStorage {
  get(key: CredentialsKey): string | undefined
  set(key: CredentialsKey, value: string): void
  delete(key: CredentialsKey): void
  subscribe(
    callback: (key: CredentialsKey, value: string | undefined) => void
  ): () => void
}

const KEYS: CredentialsKey[] = [
  'serverUrl',
  'signedUp',
  'userId',
  'encryptSecret'
]

export const DEFAULT_URL = 'wss://slowreader.app/'

export class Credentials extends LocalStore {
  static storage: CredentialsStorage | undefined

  readonly serverUrl: string = DEFAULT_URL
  readonly signedUp: boolean = false
  readonly userId: string | undefined
  readonly encryptSecret: string | undefined

  private accessSecret: string | undefined
  private unbind: () => void

  constructor () {
    super()
    let storage = this.getStorage()
    let set = (key: CredentialsKey, value: string | undefined) => {
      if (key === 'serverUrl') {
        this[change](key, value ?? DEFAULT_URL)
      } else if (key === 'signedUp') {
        this[change](key, !!value)
      } else {
        this[change](key, value)
      }
    }
    for (let i of KEYS) set(i, storage.get(i))
    this.unbind = storage.subscribe(set)
  }

  async signIn (userId: string, password: string) {
    let passwordParts = password.split(':')
    if (passwordParts.length !== 2) {
      throw new SlowReaderError('wrong-password')
    }
    let [accessSecret, encryptSecret] = passwordParts
    let correct = await signIn(this.serverUrl, userId, accessSecret)
    if (correct) {
      this.setSignedUp()
      this.change('userId', userId)
      this.change('encryptSecret', encryptSecret)
    }
    return correct
  }

  signOut () {
    signOut(this.serverUrl)
    this[change]('signedUp', false)
    this.getStorage().delete('signedUp')
    this[change]('userId', undefined)
    this.getStorage().delete('userId')
    this[change]('encryptSecret', undefined)
    this.getStorage().delete('encryptSecret')
  }

  async signUp () {
    if (this.signedUp) {
      throw new Error('User was already signed up')
    }
    if (!this.userId) {
      throw new Error('Generate credentials first')
    }
    await signUp(this.serverUrl, this.userId, this.getAccessSecret())
    this.setSignedUp()
    delete this.accessSecret
  }

  generate () {
    this.change('userId', nanoid(10))
    this.change('encryptSecret', nanoid(16))
  }

  changeServerUrl (serverUrl: string) {
    if (this.signedUp) {
      throw new Error('Server can’t be changed for existed user')
    }
    this.change('serverUrl', serverUrl)
  }

  getPassword () {
    if (!this.encryptSecret) {
      this.generate()
    }
    return `${this.getAccessSecret()}:${this.encryptSecret}`
  }

  private getStorage (): CredentialsStorage {
    if (!Credentials.storage) {
      throw new SlowReaderError('missed-settings-store')
    }
    return Credentials.storage
  }

  private getAccessSecret (): string {
    if (this.signedUp) {
      throw new Error('No way to get access password for existed user')
    }
    if (!this.accessSecret) {
      this.accessSecret = nanoid(16)
    }
    return this.accessSecret
  }

  private change (key: Exclude<CredentialsKey, 'signedUp'>, value: string) {
    this[change](key, value)
    this.getStorage().set(key, value)
  }

  private setSignedUp () {
    this[change]('signedUp', true)
    this.getStorage().set('signedUp', '1')
  }

  [destroy] () {
    this.unbind()
  }
}
