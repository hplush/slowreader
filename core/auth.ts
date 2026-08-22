import { signIn as signInApi, signUp as signUpApi } from '@slowreader/api'
import { customAlphabet } from 'nanoid'

import { getClient } from './client.ts'
import { getEnvironment } from './environment.ts'
import { checkErrors } from './lib/http.ts'
import { markDatabaseDownloading } from './schema.ts'
import {
  benchmarkStatistics,
  dbMigrating,
  encryptionKey,
  hasPassword,
  syncServer,
  userId
} from './settings.ts'

let generateUserId = customAlphabet('0123456789', 16)
let generateKey = customAlphabet(
  'abcdefghijklmnopqrstuvwxyz' +
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
    '0123456789' +
    '!@#$%^&*()-_+=/?<>"\';:[]{}',
  10
)

export interface Credentials {
  encryptionKey: string
  password: string
  userId: string
}

function useServer(domain: string | undefined): string {
  if (domain) {
    syncServer.set(domain)
  } else {
    let server = getEnvironment().server
    if (typeof server !== 'string') {
      return ''
      /* node:coverage ignore next 3 */
    } else {
      domain = server
    }
  }
  let protocol = domain.startsWith('localhost') ? 'http' : 'https'
  return `${protocol}://${domain}`
}

export async function signIn(
  credentials: Credentials,
  server?: string
): Promise<void> {
  let host = useServer(server)
  let response = await checkErrors(
    signInApi,
    {
      password: credentials.password,
      userId: credentials.userId
    },
    host
  )
  userId.set(undefined)
  getEnvironment().saveSession(response.session)
  hasPassword.set(true)
  markDatabaseDownloading()
  useCredentials(credentials)
}

export async function signUp(
  credentials: Credentials,
  server?: string
): Promise<void> {
  let host = useServer(server)
  let response = await checkErrors(
    signUpApi,
    { password: credentials.password, userId: credentials.userId },
    host
  )
  getEnvironment().saveSession(response.session)
  dbMigrating.set('signing-up')
  hasPassword.set(true)
  useCredentials(credentials)
}

export function generateCredentials(user?: string, key?: string): Credentials {
  return {
    encryptionKey: key ?? generateKey(),
    password: generateKey(),
    userId: user ?? generateUserId()
  }
}

/**
 * Generate string combining server’s password and local encryption key
 * to use it in password managers.
 */
export function toSecret(credentials: Credentials): string {
  return `${credentials.password} ${credentials.encryptionKey}`
}

/**
 * Start app locally using this user ID.
 */
export function useCredentials(credentials: Credentials): void {
  encryptionKey.set(credentials.encryptionKey)
  userId.set(credentials.userId)
}

let signOutListeners: (() => void)[] = []

/**
 * Add a callback to clean data which only the client knows about, like
 * a mode mark in `sessionStorage`. Returns a function to remove the callback.
 *
 * `Environment#cleanStorage()` cleans the log and the settings, and this
 * is for everything else.
 */
export function onSignOut(callback: () => void): () => void {
  signOutListeners.push(callback)
  return () => {
    signOutListeners = signOutListeners.filter(i => i !== callback)
  }
}

export async function signOut(): Promise<void> {
  await getClient().clean()
  userId.set(undefined)
  hasPassword.set(false)
  encryptionKey.set(undefined)
  syncServer.set(undefined)
  benchmarkStatistics.set(undefined)
  for (let listener of signOutListeners) listener()
  let env = getEnvironment()
  env.saveSession(undefined)
  env.cleanStorage()
  env.openRoute({ params: {}, popups: [], route: 'home' })
  env.restartApp()
}
