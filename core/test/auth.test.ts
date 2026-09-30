import type { TestServer } from '@logux/server'
import { IS_PASSWORD } from '@slowreader/api'
import {
  buildTestServer,
  cleanAllTables,
  FakeAuthenticator
} from '@slowreader/server/test'
import { deepEqual, equal, notEqual, ok } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  authMessages,
  benchmarkStatistics,
  client,
  commonMessages,
  enableTestTime,
  encryptionKey,
  encryptionKeyLost,
  type Environment,
  generateCredentials,
  getEnvironment,
  hasCloud,
  NetworkError,
  onSignOut,
  passkeyOnly,
  router,
  type SavedPassword,
  setupEnvironment,
  signInByPassword,
  signOut,
  signUpByPassword,
  syncServer,
  startLocalUser,
  UserFacingError,
  userId
} from '../index.ts'
import { WrongPasswordError } from '../lib/keys.ts'
import {
  expectWarning,
  getTestEnvironment,
  openPage,
  openRoute,
  passkeyEnvironment,
  setTestUser,
  testSession,
  testSignals,
  throws,
  waitFor,
  waitUntil
} from './utils.ts'

describe('auth', () => {
  let server: TestServer
  let storage: Record<string, string>
  let environment: Environment
  beforeEach(() => {
    server = buildTestServer()
    environment = getTestEnvironment()
    storage = environment.persistentStore
    setupEnvironment({ ...environment, server })
    enableTestTime()
  })

  afterEach(async () => {
    setTestUser(false)
    await server.destroy()
    await cleanAllTables()
  })

  test('has local demo mode', async () => {
    equal(typeof client.get(), 'undefined')

    let credentials = generateCredentials()
    ok(IS_PASSWORD.test(credentials.password))

    await startLocalUser(credentials)
    ok(client.get()!.clientId.startsWith(credentials.userId + ':'))
    equal(client.get()!.connected, false)
    equal(userId.get(), credentials.userId)
    ok(encryptionKey.get())
    equal(encryptionKey.get()!.extractable, false)
    equal(await getEnvironment().loadEncryptionKey(), encryptionKey.get())
    equal(typeof storage['slowreader:encryptionKey'], 'undefined')
    equal(typeof syncServer.get(), 'undefined')
    equal(typeof testSession, 'undefined')
    openRoute({ params: {}, route: 'cloud' })

    let cleaned = 0
    let unbindSignOut = onSignOut(() => {
      cleaned += 1
    })
    onSignOut(() => {
      cleaned += 10
    })()

    // Benchmark data of the previous start
    let statistics = {
      biggestCategory: 'category',
      debug: false,
      duration: 100,
      feeds: 10,
      posts: 100,
      readerFeed: 'feed',
      slowFeeds: ['feed']
    }
    storage['slowreader:benchmark'] = JSON.stringify(statistics)
    let unbindStatistics = benchmarkStatistics.listen(() => {})
    deepEqual(benchmarkStatistics.get(), statistics)

    // Benchmark saved new data during the session
    let newStatistics = { ...statistics, feeds: 20 }
    benchmarkStatistics.set(newStatistics)
    equal(storage['slowreader:benchmark'], JSON.stringify(newStatistics))

    await signOut()
    equal(router.get().route, 'start')
    equal(typeof client.get(), 'undefined')
    equal(typeof userId.get(), 'undefined')
    equal(typeof encryptionKey.get(), 'undefined')
    equal(await getEnvironment().loadEncryptionKey(), undefined)
    equal(typeof benchmarkStatistics.get(), 'undefined')
    equal(typeof storage['slowreader:benchmark'], 'undefined')
    equal(cleaned, 1)
    unbindStatistics()
    unbindSignOut()
  })

  test('restores encryption key on start', async () => {
    function restart(): void {
      encryptionKey.set(undefined)
      setupEnvironment({ ...environment, server })
    }

    restart()
    equal(encryptionKey.get(), undefined)

    let credentials = generateCredentials()
    await startLocalUser(credentials)
    let key = encryptionKey.get()
    restart()
    await waitUntil(() => !!encryptionKey.get())
    equal(encryptionKey.get(), key)

    await environment.saveEncryptionKey(undefined)
    restart()
    await waitUntil(() => !!encryptionKey.get())
    notEqual(encryptionKey.get(), key)
    equal(userId.get(), credentials.userId)
    equal(encryptionKeyLost.get(), false)

    hasCloud.set(true)
    await environment.saveEncryptionKey(undefined)
    restart()
    await waitUntil(() => encryptionKeyLost.get())
    equal(encryptionKey.get(), undefined)
    equal(userId.get(), credentials.userId)
  })

  test('loads key saved by another tab', async () => {
    let credentials = generateCredentials()
    await startLocalUser(credentials)
    let key = encryptionKey.get()
    encryptionKey.set(undefined)
    userId.set(undefined)

    userId.set(credentials.userId)
    await waitUntil(() => !!encryptionKey.get())
    equal(encryptionKey.get(), key)
  })

  test('allows create user', async () => {
    equal(typeof client.get(), 'undefined')

    let credentials = generateCredentials()
    await signUpByPassword(credentials)
    equal(hasCloud.get(), true)
    equal(typeof syncServer.get(), 'undefined')
    equal(client.get()!.state, 'connecting')
    equal(typeof testSession, 'string')

    await waitUntil(() => client.get()!.connected)

    await signOut()
    equal(typeof client.get(), 'undefined')
    equal(typeof userId.get(), 'undefined')
    equal(typeof encryptionKey.get(), 'undefined')
  })

  test('allows to create user from local mode', async () => {
    let local = generateCredentials()
    await startLocalUser(local)
    ok(client.get()!.clientId.startsWith(local.userId + ':'))
    equal(userId.get(), local.userId)
    equal(hasCloud.get(), false)
    equal(client.get()!.connected, false)
    let localKey = encryptionKey.get()

    let later = generateCredentials(local.userId)
    equal(later.userId, local.userId)
    notEqual(later.password, local.password)

    let prevClient = server.connected.size
    await signUpByPassword(later)
    equal(hasCloud.get(), true)
    notEqual(encryptionKey.get(), localKey)
    equal(typeof syncServer.get(), 'undefined')
    equal(client.get()!.state, 'connecting')
    equal(typeof testSession, 'string')

    await waitUntil(() => client.get()!.connected)
    equal(server.connected.size, prevClient + 1)

    await signOut()
    await waitUntil(() => server.connected.size === prevClient)
    equal(typeof client.get(), 'undefined')
    equal(typeof testSession, 'undefined')

    await signInByPassword(later.userId, later.password)
    equal(client.get()!.state, 'connecting')
    await waitUntil(() => client.get()!.connected)
    equal(userId.get(), later.userId)
    equal(typeof testSession, 'string')

    await waitUntil(() => client.get()!.connected)
  })

  test('deletes server session on sign out', async () => {
    let credentials = generateCredentials()
    await signUpByPassword(credentials)
    let session = testSession!
    await waitUntil(() => client.get()!.connected)

    await signOut()
    await server.expectWrongCredentials(credentials.userId, { token: session })
  })

  test('signs out when server is not available', async () => {
    let credentials = generateCredentials()
    await signUpByPassword(credentials)
    let error = new TypeError('Network error')
    server.fetch = () => {
      throw error
    }
    await expectWarning(async () => {
      await signOut()
    }, [new NetworkError(error)])
    equal(typeof userId.get(), 'undefined')
  })

  test('remembers custom server', async () => {
    // @ts-expect-error Hacky mocking for tests
    server.fetch = () => {
      return {
        json: () => ({}),
        ok: true
      }
    }

    let credentials = generateCredentials()
    await signUpByPassword(credentials, 'https://example.com')
    equal(syncServer.get(), 'https://example.com')

    await signOut()
    equal(typeof syncServer.get(), 'undefined')
  })

  test('reports about wrong credentials', async () => {
    let credentials = generateCredentials()
    let error = await throws(() =>
      signInByPassword(credentials.userId, credentials.password)
    )
    ok(error instanceof UserFacingError)
    equal(error.message, 'Invalid credentials')
  })

  test('checks password locally', async () => {
    let credentials = generateCredentials()
    await signUpByPassword(credentials)
    await signOut()

    // Server can’t know the unlock part of the password
    let wrong = credentials.password.slice(0, 22) + 'A'.repeat(44)
    let error = await throws(() => signInByPassword(credentials.userId, wrong))
    ok(error instanceof WrongPasswordError)
  })
})

function toBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString('base64url')
}

describe('passkey auth', () => {
  let server: TestServer
  let authenticator: FakeAuthenticator
  let sent: string[]
  let prfs: ArrayBuffer[]
  let saved: SavedPassword[]
  let requests: object[]

  function setup(): void {
    let passkeys = passkeyEnvironment(authenticator, requests)
    setupEnvironment({
      ...getTestEnvironment(),
      ...passkeys,
      async createPasskey(opts) {
        let result = await passkeys.createPasskey!(opts)
        if (result?.prf) prfs.push(result.prf)
        return result
      },
      async getPasskey(opts) {
        let result = await passkeys.getPasskey!(opts)
        if (result?.prf) prfs.push(result.prf)
        return result
      },
      savePassword(fields) {
        saved.push(fields)
        return Promise.resolve()
      },
      server
    })
    enableTestTime()
  }

  beforeEach(() => {
    server = buildTestServer()
    authenticator = new FakeAuthenticator()
    sent = []
    prfs = []
    saved = []
    requests = []
    let originFetch = server.fetch
    server.fetch = (url, init) => {
      if (typeof init?.body === 'string') sent.push(init.body)
      return originFetch(url, init)
    }
    server.on('add', action => {
      sent.push(JSON.stringify(action))
    })
    setup()
  })

  afterEach(async () => {
    openRoute({ params: {}, route: 'home' })
    setTestUser(false)
    await server.destroy()
    await cleanAllTables()
  })

  function expectNoPrfLeak(): void {
    ok(prfs.length > 0)
    let all = sent.join('\n')
    for (let prf of prfs) {
      equal(all.includes(toBase64(prf)), false, 'PRF output was sent')
    }
  }

  async function signUpByPasskey(): Promise<{
    password: string
    user: string
  }> {
    let page = openPage({ params: {}, route: 'signUp' })
    equal(page.usePassword.get(), false)
    await page.submit()
    equal(page.error.get(), undefined)
    let user = page.userId.get()
    let password = page.password.get()
    page.finish()
    return { password, user }
  }

  test('signs up and signs in with passkey', async () => {
    let page = openPage({ params: {}, route: 'signUp' })
    await page.submit()
    deepEqual(page.step.get(), { type: 'form' })
    deepEqual(saved, [])
    equal(passkeyOnly.get(), true)
    let user = page.userId.get()
    await waitFor(router, route => route.route === 'welcome')

    await waitUntil(() => client.get()?.state === 'synchronized')
    await signOut()
    equal(userId.get(), undefined)

    let start = openPage({ params: {}, route: 'start' })
    equal(start.usePassword.get(), false)
    ok(await start.signInByPasskey())
    equal(start.signError.get(), undefined)
    equal(userId.get(), user)
    equal(hasCloud.get(), true)
    equal(passkeyOnly.get(), true)
    deepEqual(testSignals.at(-1), { type: 'details', userId: user })
    await waitUntil(() => client.get()?.state === 'synchronized')
    expectNoPrfLeak()
  })

  test('asks backup password for device-bound passkey', async () => {
    authenticator.synced = false
    let page = openPage({ params: {}, route: 'signUp' })
    await page.submit()
    deepEqual(page.step.get(), { provider: 'Apple Passwords', type: 'passkey' })
    equal(page.hideBusy.get(), true)
    equal(passkeyOnly.get(), false)
    let password = page.password.get()
    let user = page.userId.get()
    page.addAnotherPasskey()
    equal(router.get().route, 'cloud')
    await waitUntil(() => client.get()?.state === 'synchronized')
    await signOut()
    await signInByPassword(user, password)
    equal(passkeyOnly.get(), false)
  })

  test('asks PRF by get() if create() has no it', async () => {
    authenticator.prf = 'get'
    await signUpByPasskey()
    equal(requests.length, 2)
    equal(hasCloud.get(), true)
    expectNoPrfLeak()
  })

  test('rejects passkey without PRF', async () => {
    authenticator.prf = 'never'
    let page = openPage({ params: {}, route: 'signUp' })
    await page.submit()
    deepEqual(page.step.get(), { type: 'form' })
    equal(page.error.get(), authMessages.get().passkeyNoPrf)
    equal(page.hideMenu.get(), false)
    equal(hasCloud.get(), false)
    equal(saved.length, 0)
    let created = [...authenticator.credentials.keys()][0]
    deepEqual(testSignals, [{ credentialId: created, type: 'unknown' }])
  })

  test('does nothing on cancel', async () => {
    setupEnvironment({
      ...getTestEnvironment(),
      ...passkeyEnvironment(authenticator),
      createPasskey() {
        return Promise.resolve(undefined)
      },
      server
    })
    let page = openPage({ params: {}, route: 'signUp' })
    await page.submit()
    deepEqual(page.step.get(), { type: 'form' })
    equal(page.error.get(), undefined)
    equal(page.hideMenu.get(), false)
    equal(hasCloud.get(), false)
  })

  test('switches to password on sign in without PRF', async () => {
    await signUpByPasskey()
    await waitUntil(() => client.get()?.state === 'synchronized')
    await signOut()
    authenticator.prf = 'never'
    let start = openPage({ params: {}, route: 'start' })
    equal(await start.signInByPasskey(), false)
    equal(start.signError.get(), commonMessages.get().passkeyNoPrf)
    equal(start.usePassword.get(), true)
  })

  test('signals unknown passkey', async () => {
    let unknown = new FakeAuthenticator()
    unknown.create({ challenge: 'x', userId: '1000000000000000' })
    authenticator = unknown
    setup()
    let start = openPage({ params: {}, route: 'start' })
    equal(await start.signInByPasskey(), false)
    equal(start.signError.get(), commonMessages.get().unknownPasskey)
    deepEqual(testSignals, [
      { credentialId: [...unknown.credentials.keys()][0], type: 'unknown' }
    ])
  })

  test('shows password filled by password manager', () => {
    let start = openPage({ params: {}, route: 'start' })
    start.usePassword.set(false)
    start.password.set('')
    equal(start.usePassword.get(), false)
    start.password.set('filled')
    equal(start.usePassword.get(), true)
  })

  test('signs in by autofill', async () => {
    let { user } = await signUpByPasskey()
    await waitUntil(() => client.get()?.state === 'synchronized')
    await signOut()
    let start = openPage({ params: {}, route: 'start' })
    start.startAutofill()
    start.startAutofill()
    await waitUntil(() => userId.get() === user)
    ok(requests.some(i => 'conditional' in i && i.conditional))
  })

  test('offers passkey after password sign in', async () => {
    let credentials = generateCredentials()
    await signUpByPassword(credentials)
    await waitUntil(() => client.get()?.state === 'synchronized')
    await signOut()
    let start = openPage({ params: {}, route: 'start' })
    start.userId.set(credentials.userId)
    start.password.set(credentials.password)
    ok(await start.signInByPassword())
    await waitUntil(() => authenticator.credentials.size === 1)
    ok(requests.some(i => 'conditional' in i && i.conditional))
    expectNoPrfLeak()
  })

  test('ignores errors of passkey offer', async () => {
    let credentials = generateCredentials()
    await signUpByPassword(credentials)
    await waitUntil(() => client.get()?.state === 'synchronized')
    await signOut()
    authenticator.prf = 'never'
    let start = openPage({ params: {}, route: 'start' })
    start.userId.set(credentials.userId)
    start.password.set(credentials.password)
    ok(await start.signInByPassword())
    await waitUntil(() => testSignals.length === 1)
    equal(start.signError.get(), undefined)
  })

  test('shows autofill errors', async () => {
    let unknown = new FakeAuthenticator()
    unknown.create({ challenge: 'x', userId: '1000000000000000' })
    authenticator = unknown
    setup()
    let start = openPage({ params: {}, route: 'start' })
    start.startAutofill()
    await waitFor(start.signError, error => !!error)
    equal(start.signError.get(), commonMessages.get().unknownPasskey)
  })
})
