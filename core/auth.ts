import {
  type ChallengeType,
  type PasskeyChallengeResponse,
  type Proof,
  type RegistrationResponse,
  newPassword,
  passkeyChallenge,
  passwordLockedKey,
  REAUTH_ERRORS,
  SIGN_IN_ERRORS,
  signIn as signInApi,
  signOut as signOutApi,
  signUp as signUpApi
} from '@slowreader/api'
import { customAlphabet } from 'nanoid'

import { busyDuring } from './busy.ts'
import { client, getClient } from './client.ts'
import { getEnvironment, onEnvironment } from './environment.ts'
import { UserFacingError } from './errors.ts'
import { hasFeeds } from './feed.ts'
import { checkErrors } from './lib/http.ts'
import {
  generateDataKey,
  generatePassword,
  lockDataKey,
  passkeyUnlockKey,
  passwordUnlockKey,
  prfSalt,
  splitPassword,
  toEncryptionKey,
  unlockDataKey,
  WrongPasswordError
} from './lib/keys.ts'
import {
  createWithPrf,
  filterAssertion,
  filterProof,
  filterRegistration,
  isBackedUp,
  PasskeyNoPrfError
} from './lib/webauthn.ts'
import { commonMessages } from './messages/index.ts'
import { markDatabaseDownloading } from './schema.ts'
import {
  benchmarkStatistics,
  encryptionKey,
  encryptionKeyLost,
  hasCloud,
  passkeyOnly,
  syncServer,
  uploadingLocalData,
  userId
} from './settings.ts'
import { isDemo, welcomeSteps } from './welcome.ts'

let generateUserId = customAlphabet('0123456789', 16)

export interface Credentials {
  /**
   * Random data key. It never changes, so a new password doesn’t need
   * to re-encrypt the data.
   */
  encryptionKey: Uint8Array<ArrayBuffer>
  password: string
  userId: string
}

interface NewPasskey {
  lockedKey: string
  response: RegistrationResponse
  synced: boolean
}

/**
 * Sync server URL for auth HTTP requests.
 */
export function getServerUrl(domain?: string): string {
  if (domain) {
    syncServer.set(domain)
  } else {
    let server = getEnvironment().server
    domain = syncServer.get()
    if (!domain) {
      if (typeof server !== 'string') {
        return ''
        /* node:coverage ignore next 3 */
      } else {
        domain = server
      }
    }
  }
  let protocol = domain.startsWith('localhost') ? 'http' : 'https'
  return `${protocol}://${domain}`
}

/**
 * Server challenge for every passkey operation to prevent replay.
 */
export function getPasskeyChallenge(
  type: ChallengeType
): Promise<PasskeyChallengeResponse> {
  let session = getEnvironment().getSession()
  return checkErrors(
    passkeyChallenge,
    session ? { session, type } : { type },
    getServerUrl()
  )
}

/**
 * Random account for start and sign-up pages.
 */
export function generateCredentials(user?: string): Credentials {
  return {
    encryptionKey: generateDataKey(),
    password: generatePassword(),
    userId: user ?? generateUserId()
  }
}

/**
 * Start local-only app on start page.
 */
export async function startLocalUser(
  credentials: Pick<Credentials, 'encryptionKey' | 'userId'>
): Promise<void> {
  let key = await toEncryptionKey(credentials.encryptionKey)
  await getEnvironment().saveEncryptionKey(key)
  encryptionKey.set(key)
  userId.set(credentials.userId)
}

/**
 * Switch app to cloud account after password or passkey sign-in.
 */
export async function startCloudSession(
  session: string,
  credentials: Pick<Credentials, 'encryptionKey' | 'userId'>
): Promise<void> {
  let key = await toEncryptionKey(credentials.encryptionKey)
  await getEnvironment().saveEncryptionKey(key)
  userId.set(undefined)
  encryptionKey.set(key)
  encryptionKeyLost.set(false)
  getEnvironment().saveSession(session)
  hasCloud.set(true)
  markDatabaseDownloading()
  // The feeds of the account are known only after the download
  hasFeeds.set(undefined)
  userId.set(credentials.userId)
}

/**
 * Passkey sign-in for start and relogin pages.
 */
export async function signInByPasskey(
  opts: { conditional?: boolean; signal?: AbortSignal } = {}
): Promise<boolean> {
  let env = getEnvironment()
  let challenge = await getPasskeyChallenge('signIn')
  let result = await env.getPasskey({
    allowCredentials: [],
    challenge: challenge.challenge,
    conditional: opts.conditional,
    prfSalt: await prfSalt('encryption'),
    rpId: challenge.rpId,
    signal: opts.signal
  })
  if (!result) return false
  if (!result.prf) throw new PasskeyNoPrfError()
  let answer
  try {
    answer = await checkErrors(
      signInApi,
      { passkey: filterAssertion(result.response) },
      getServerUrl()
    )
  } catch (e) {
    if (
      e instanceof UserFacingError &&
      e.message === SIGN_IN_ERRORS.unknownPasskey
    ) {
      env.signalPasskeys({ credentialId: result.response.id, type: 'unknown' })
    }
    throw e
  }
  let dataKey = await unlockDataKey(
    answer.lockedKey,
    await passkeyUnlockKey(result.prf)
  )
  passkeyOnly.set(!answer.hasPassword)
  await startCloudSession(answer.session, {
    encryptionKey: dataKey,
    userId: answer.userId
  })
  env.signalPasskeys({ type: 'details', userId: answer.userId })
  return true
}

/**
 * Password sign-in for start and relogin pages.
 */
export async function signInByPassword(
  user: string,
  password: string,
  server?: string
): Promise<void> {
  let host = getServerUrl(server)
  let response = await checkErrors(
    signInApi,
    { password: { authKey: splitPassword(password).authKey }, userId: user },
    host
  )
  let unlockKey = await passwordUnlockKey(password, user)
  let dataKey = await unlockDataKey(response.lockedKey, unlockKey)
  await startCloudSession(response.session, {
    encryptionKey: dataKey,
    userId: user
  })
}

async function createUser(
  credentials: Credentials,
  passkey?: NewPasskey,
  server?: string
): Promise<{ provider: null | string; synced: boolean } | undefined> {
  let host = getServerUrl(server)
  let user = credentials.userId
  let sent = passkey && {
    lockedKey: passkey.lockedKey,
    response: passkey.response
  }
  let response = await checkErrors(
    signUpApi,
    passkey?.synced
      ? { passkey: sent!, userId: user }
      : {
          passkey: sent,
          password: {
            authKey: splitPassword(credentials.password).authKey,
            lockedKey: await lockDataKey(
              credentials.encryptionKey,
              await passwordUnlockKey(credentials.password, user)
            )
          },
          userId: user
        },
    host
  )
  let key = await toEncryptionKey(credentials.encryptionKey)
  await getEnvironment().saveEncryptionKey(key)
  // Client must be created once with the new key and the connection,
  // so it will not send local data encrypted by the previous key
  encryptionKey.set(undefined)
  userId.set(credentials.userId)
  getEnvironment().saveSession(response.session)
  uploadingLocalData.set(true)
  hasCloud.set(true)
  passkeyOnly.set(!!passkey?.synced)
  encryptionKey.set(key)
  return response.passkey
}

export type PasskeySignUp =
  | {
      passkey: { provider: null | string; synced: boolean }
      type: 'passkey'
    }
  | { type: 'cancelled' }
  | { type: 'noPrf' }

/**
 * Default sign-up method on sign-up page.
 */
export async function signUpByPasskey(
  credentials: Credentials
): Promise<PasskeySignUp> {
  let challenge = await getPasskeyChallenge('signUp')
  let created = await createWithPrf(challenge, credentials.userId)
  if (created.type === 'cancelled') {
    return created
  } else if (created.type === 'noPrf') {
    return created
  } else {
    let lockedKey = await lockDataKey(
      credentials.encryptionKey,
      await passkeyUnlockKey(created.prf)
    )
    // Account appears only after the passkey step, so cancelled passkey
    // dialog doesn’t leave an account with an unseen password
    let passkey = await createUser(credentials, {
      lockedKey,
      response: filterRegistration(created.response),
      synced: isBackedUp(created.response)
    })
    return { passkey: passkey!, type: 'passkey' }
  }
}

/**
 * Create cloud account with only password on sign-up page.
 */
export async function signUpByPassword(
  credentials: Credentials,
  server?: string
): Promise<void> {
  await createUser(credentials, undefined, server)
}

export type ReauthResult = {
  dataKey: Uint8Array<ArrayBuffer>
  proof: Proof
}

/**
 * Passkey proof and data key to change sign-in methods on Cloud page.
 * Returns `undefined` if user cancelled the dialog.
 */
export async function reauthByPasskey(
  list: { id: string; lockedKey: string }[]
): Promise<ReauthResult | undefined> {
  let challenge = await getPasskeyChallenge('reauth')
  let result = await getEnvironment().getPasskey({
    allowCredentials: challenge.credentials,
    challenge: challenge.challenge,
    prfSalt: await prfSalt('encryption'),
    rpId: challenge.rpId
  })
  if (!result) return undefined
  if (!result.prf) throw new PasskeyNoPrfError()
  let id = result.response.id
  let locked = list.find(i => i.id === id)
  /* node:coverage ignore next */
  if (!locked) throw new PasskeyNoPrfError()
  let dataKey = await unlockDataKey(
    locked.lockedKey,
    await passkeyUnlockKey(result.prf)
  )
  return { dataKey, proof: { assertion: result.response } }
}

/**
 * Password proof and data key to change sign-in methods on Cloud page.
 */
export async function reauthByPassword(
  password: string
): Promise<ReauthResult> {
  let authKey = splitPassword(password).authKey
  let session = getEnvironment().getSession()
  let answer
  try {
    // Server returns locked key only after the check,
    // so device never keeps it
    answer = await checkErrors(
      passwordLockedKey,
      session ? { authKey, session } : { authKey },
      getServerUrl()
    )
  } catch (e) {
    if (
      e instanceof UserFacingError &&
      e.message === REAUTH_ERRORS.wrongProof
    ) {
      throw new WrongPasswordError()
    }
    throw e
  }
  let dataKey = await unlockDataKey(
    answer.lockedKey,
    await passwordUnlockKey(password, userId.get()!)
  )
  return { dataKey, proof: { authKey } }
}

/**
 * Replace password on Cloud page. Server signs out all sessions,
 * including the current one, and returns a new one.
 */
export async function generateNewPassword(
  reauth: ReauthResult
): Promise<string> {
  let user = userId.get()!
  let password = generatePassword()
  let lockedKey = await lockDataKey(
    reauth.dataKey,
    await passwordUnlockKey(password, user)
  )
  let env = getEnvironment()
  let session = env.getSession()
  // Server will disconnect the client, which must not reconnect
  // with the old session
  getClient().node.connection.disconnect('destroy')
  let request = {
    authKey: splitPassword(password).authKey,
    lockedKey,
    proof: filterProof(reauth.proof),
    ...(session ? { session } : {})
  }
  let answer: { session: string }
  try {
    answer = await checkErrors(newPassword, request, getServerUrl())
  } catch (e) {
    try {
      // The response could be lost after the change on the server
      answer = await checkErrors(
        signInApi,
        { password: { authKey: request.authKey }, userId: user },
        getServerUrl()
      )
    } catch {
      void getClient().node.connection.connect()
      throw e
    }
  }
  env.saveSession(answer.session)
  passkeyOnly.set(false)
  void getClient().node.connection.connect()
  return password
}

let signOutListeners: (() => void)[] = []

/**
 * Clean environment-specific data, which core doesn’t know about.
 */
export function onSignOut(callback: () => void): () => void {
  signOutListeners.push(callback)
  return () => {
    signOutListeners = signOutListeners.filter(i => i !== callback)
  }
}

/**
 * Remove user data from the device on signing out fatal page.
 */
export function forgetLocalData(): void {
  userId.set(undefined)
  hasCloud.set(false)
  passkeyOnly.set(false)
  hasFeeds.set(undefined)
  isDemo.set(false)
  welcomeSteps.set(undefined)
  encryptionKey.set(undefined)
  syncServer.set(undefined)
  benchmarkStatistics.set(undefined)
  for (let listener of signOutListeners) listener()
  let env = getEnvironment()
  env.saveSession(undefined)
  void env.saveEncryptionKey(undefined)
  env.cleanStorage()
  env.openRoute({ params: {}, popups: [], route: 'home' })
  env.restartApp()
}

/**
 * Sign out button on Cloud, Storage, relogin pages, and session popup.
 */
export function signOut(): Promise<void> {
  return busyDuring(
    commonMessages.get().signingOut,
    async () => {
      if (hasCloud.get()) {
        let session = getEnvironment().getSession()
        // Sign-out must work offline, the session stays in the list
        // of other devices and can be deleted there
        try {
          await checkErrors(
            signOutApi,
            session ? { session } : {},
            getServerUrl()
          )
        } catch {}
      }
      await client.get()?.clean()
      forgetLocalData()
    },
    true
  )
}

onEnvironment(env => {
  async function restoreEncryptionKey(): Promise<void> {
    let key = await env.loadEncryptionKey()
    // Sign-in could set the key during the loading
    if (encryptionKey.get()) return
    if (!key && userId.get()) {
      if (hasCloud.get()) {
        encryptionKeyLost.set(true)
        return
      }
      // Local data is not encrypted and sign-up generates its own key,
      // so the new key loses nothing. Only partly cleaned browser storage
      // could lead here, demo creates the key by itself.
      key = await toEncryptionKey(generateDataKey())
      await env.saveEncryptionKey(key)
    }
    if (key) encryptionKey.set(key)
  }

  void restoreEncryptionKey()
  // Another tab signed in and saved the key
  return userId.listen(user => {
    if (user && !encryptionKey.get()) void restoreEncryptionKey()
  })
})
