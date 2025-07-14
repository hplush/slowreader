import { signIn as signInApi, signUp as signUpApi } from '@slowreader/api'
import { customAlphabet } from 'nanoid'

import { getClient } from './client.ts'
import { getEnvironment } from './environment.ts'
import { checkErrors } from './lib/http.ts'
import { encryptionKey, hasPassword, syncServer, userId } from './settings.ts'

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
    if (typeof server !== 'string') return ''
    /* c8 ignore next 2 */
    domain = server
  }
  let protocol = domain.startsWith('localhost') ? 'http' : 'https'
  return `${protocol}://${domain}`
}

export async function signIn(
  credentials: Credentials,
  server?: string
): Promise<void> {
  let host = useServer(server)
  await checkErrors(
    signInApi,
    {
      password: credentials.password,
      userId: credentials.userId
    },
    host
  )
  hasPassword.set(true)
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
  hasPassword.set(true)
  useCredentials(credentials)
}

export function generateCredentials(): Credentials {
  return {
    encryptionKey: generateKey(),
    password: generateKey(),
    userId: generateUserId()
  }
}

export function toSecret(credentials: Credentials): string {
  return `${credentials.password} ${credentials.encryptionKey}`
}

export function useCredentials(credentials: Credentials): void {
  encryptionKey.set(credentials.encryptionKey)
  userId.set(credentials.userId)
}

export async function signOut(): Promise<void> {
  await getClient().clean()
  userId.set(undefined)
  hasPassword.set(false)
  encryptionKey.set(undefined)
  syncServer.set(undefined)
  getEnvironment().restartApp()
}
