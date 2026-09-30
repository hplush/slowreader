import type { TestServer } from '@logux/server'
import {
  buildTestServer,
  cleanAllTables,
  FakeAuthenticator
} from '@slowreader/server/test'
import { deepEqual, equal, notEqual, ok } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  client,
  type Loadable,
  closeLastPopup,
  cloudMessages,
  currentSessionId,
  hasCloud,
  NetworkError,
  router,
  signInByPassword,
  type CloudPage,
  signOut,
  userId,
  waitLoading
} from '../../index.ts'
import {
  checkLoadedPopup,
  cleanClient,
  expectWarning,
  openPage,
  openRoute,
  openTestPopup,
  passkeyEnvironment,
  startClient,
  testSession,
  testSignals,
  waitFor,
  waitUntil
} from '../utils.ts'

function ready<Item>(list: Loadable<Item[]>): Item[] | undefined {
  return list.status === 'ready' ? list.value : undefined
}

async function signUpCloud(): Promise<{
  page: CloudPage
  password: string
}> {
  let signupPage = openPage({ params: {}, route: 'signUp' })
  await signupPage.submit()
  equal(signupPage.error.get(), undefined)
  let password = signupPage.password.get()
  signupPage.finish()
  await waitUntil(() => client.get()?.state === 'synchronized')
  let page = openPage({ params: {}, route: 'cloud' })
  await waitFor(page.passkeys, list => ready(list)?.length === 1)
  await waitFor(page.sessions, list => ready(list)?.length === 1)
  return { page, password }
}

let savedPasswords: string[] | undefined

function setSavePassword(list: string[]): void {
  savedPasswords = list
}

describe('cloud page', () => {
  let server: TestServer
  let authenticator: FakeAuthenticator
  beforeEach(() => {
    server = buildTestServer()
    authenticator = new FakeAuthenticator({ synced: false })
    savedPasswords = undefined
    startClient({
      server,
      ...passkeyEnvironment(authenticator),
      savePassword(fields) {
        savedPasswords?.push(fields.password)
        return Promise.resolve()
      }
    })
    openRoute({ params: {}, route: 'fatal' })
  })

  afterEach(async () => {
    await cleanClient()
    await cleanAllTables()
  })

  test('deletes users', async () => {
    let page = openPage({ params: {}, route: 'cloud' })
    equal(page.hasCloud.get(), false)
    deepEqual(page.passkeys.get(), { status: 'loading' })
    equal(client.get()?.state, 'disconnected')

    let signupPage = openPage({ params: {}, route: 'signUp' })
    signupPage.usePassword.set(true)
    await signupPage.submit()

    page = openPage({ params: {}, route: 'cloud' })
    equal(page.hasCloud.get(), true)
    await waitUntil(() => client.get()?.state === 'synchronized')
    equal(page.deletingAccount.get(), false)

    let promise = page.deleteAccount()
    equal(page.deletingAccount.get(), true)
    await promise
    equal(client.get(), undefined)
  })

  test('creates backup password for account without it', async () => {
    authenticator.synced = true
    let signupPage = openPage({ params: {}, route: 'signUp' })
    await signupPage.submit()
    await waitUntil(() => client.get()?.state === 'synchronized')
    let page = openPage({ params: {}, route: 'cloud' })
    await waitFor(page.passkeys, list => ready(list)?.length === 1)
    equal(page.passkeyOnly.get(), true)
    equal(page.suggestSecondPasskey.get(), false)

    page.deletePasskey(ready(page.passkeys.get())![0]!.id)
    equal(page.reauth.get()?.passwordOnly, true)
    page.cancelReauth()

    page.generateNewPassword()
    await page.confirmByPasskey()
    ok(page.newPassword.get())
    equal(page.firstPassword.get(), true)
    equal(page.passkeyOnly.get(), false)
    page.finishNewPassword()
    await waitUntil(() => client.get()?.state === 'synchronized')

    page.generateNewPassword()
    await page.confirmByPasskey()
    equal(page.firstPassword.get(), false)
  })

  test('manages passkeys', async () => {
    let { page, password } = await signUpCloud()

    let first = ready(page.passkeys.get())!
    equal(first.length, 1)
    equal(first[0]!.name, 'Apple Passwords')
    deepEqual(testSignals.at(-1), {
      ids: [first[0]!.id],
      type: 'accepted',
      userId: userId.get()
    })

    page.addPasskey()
    page.cancelReauth()
    equal(page.reauth.get(), undefined)

    page.addPasskey()
    page.reauthPassword.set('A'.repeat(22) + password.slice(22))
    await page.confirmByPassword()
    equal(page.reauthError.get(), 'Wrong password')
    equal(page.reauth.get()?.type, 'addPasskey')
    await page.confirmByPasskey()
    equal(page.reauth.get(), undefined)
    await waitFor(page.passkeys, list => ready(list)?.length === 2)
    deepEqual(
      ready(page.passkeys.get())!.map(i => i.name),
      ['Apple Passwords', 'Apple Passwords 1']
    )

    let firstPopup = openTestPopup('passkey', first[0]!.id)
    await waitLoading(firstPopup.loading)
    let loadedFirst = checkLoadedPopup(firstPopup)
    equal(loadedFirst.passkey.get()?.name, 'Apple Passwords')
    await loadedFirst.rename('Phone')
    await waitFor(page.passkeys, list => ready(list)![0]!.name === 'Phone')
    equal(loadedFirst.passkey.get()?.name, 'Phone')
    closeLastPopup()

    page.deletePasskey('unknown')
    page.reauthPassword.set(password)
    await page.confirmByPassword()
    equal(page.reauthError.get(), cloudMessages.get().wrongProof)
    page.cancelReauth()

    let second = ready(page.passkeys.get())![1]!.id
    let secondPopup = openTestPopup('passkey', second)
    await waitLoading(secondPopup.loading)
    checkLoadedPopup(secondPopup).remove()
    equal(router.get().popups.length, 0)
    deepEqual(page.reauth.get(), {
      passkeyId: second,
      passwordOnly: false,
      type: 'deletePasskey'
    })
    page.reauthPassword.set(password)
    await page.confirmByPassword()
    await waitFor(page.passkeys, list => ready(list)?.length === 1)
    deepEqual(testSignals.at(-1), {
      ids: [first[0]!.id],
      type: 'accepted',
      userId: userId.get()
    })

    page.deletePasskey(first[0]!.id)
    equal(page.reauth.get()?.passwordOnly, true)
    await page.confirmByPasskey()
    equal(ready(page.passkeys.get())?.length, 1)
    equal(page.reauth.get()?.type, 'deletePasskey')
    page.reauthPassword.set(password)
    await page.confirmByPassword()
    await waitFor(page.passkeys, list => ready(list)?.length === 0)
  })

  test('denies passkey without PRF', async () => {
    let { page } = await signUpCloud()
    authenticator.prf = 'never'
    page.addPasskey()
    await page.confirmByPasskey()
    equal(page.reauth.get()?.type, 'addPasskey')
    ok(page.reauthError.get()?.includes('encrypted data'))
  })

  test('shows network errors on re-auth', async () => {
    let { page, password } = await signUpCloud()
    let error = new TypeError('Network error')
    server.fetch = () => {
      throw error
    }
    page.addPasskey()
    page.reauthPassword.set(password)
    await expectWarning(async () => {
      await page.confirmByPassword()
    }, [new NetworkError(error)])
    ok(page.reauthError.get()?.includes('internet'))
  })

  test('suggests second passkey for not synced one', async () => {
    let { page } = await signUpCloud()
    equal(page.suggestSecondPasskey.get(), true)
  })

  test('generates new password', async () => {
    let { page, password } = await signUpCloud()
    let oldSession = testSession
    let saved: string[] = []
    setSavePassword(saved)
    page.generateNewPassword()
    await page.confirmByPasskey()
    let newPassword = page.newPassword.get()!
    ok(newPassword)
    notEqual(newPassword, password)
    notEqual(testSession, oldSession)
    ok(page.newPasswordMailTo.get().includes(userId.get()!))
    await waitUntil(() => client.get()?.state === 'synchronized')

    deepEqual(saved, [newPassword])

    page.finishNewPassword()
    equal(page.newPassword.get(), undefined)

    await waitFor(page.passkeys, list => ready(list)?.length === 1)
    let popup = openTestPopup('passkey', ready(page.passkeys.get())![0]!.id)
    await waitLoading(popup.loading)
    await checkLoadedPopup(popup).rename('Phone')
    await waitFor(page.passkeys, list => ready(list)![0]!.name === 'Phone')
    closeLastPopup()

    let user = userId.get()!
    await signOut()
    await signInByPassword(user, newPassword)
  })

  test('signs in if new password response was lost', async () => {
    let { page } = await signUpCloud()
    let fetch = server.fetch
    server.fetch = async (url, init) => {
      let response = await fetch(url, init)
      if (typeof url === 'string' && url.endsWith('/password')) {
        throw new TypeError('Lost')
      }
      return response
    }
    page.generateNewPassword()
    await expectWarning(async () => {
      await page.confirmByPasskey()
    }, [new NetworkError(new TypeError('Lost'))])
    let newPassword = page.newPassword.get()!
    ok(newPassword)
    let user = userId.get()!
    await waitUntil(() => client.get()?.state === 'synchronized')
    server.fetch = fetch
    await signOut()
    await signInByPassword(user, newPassword)
  })

  test('reports new password errors', async () => {
    let { page } = await signUpCloud()
    let error = new TypeError('Offline')
    let fetch = server.fetch
    server.fetch = (url, init) => {
      if (typeof url === 'string' && url.endsWith('/challenge')) {
        return fetch(url, init)
      }
      throw error
    }
    page.generateNewPassword()
    await expectWarning(async () => {
      await page.confirmByPasskey()
    }, [new NetworkError(error), new NetworkError(error)])
    equal(page.newPassword.get(), undefined)
    ok(page.reauthError.get())
    await waitUntil(() => !!client.get())
  })
  test('lists sessions', async () => {
    let { page, password } = await signUpCloud()
    let sessions = ready(page.sessions.get())!
    equal(sessions.length, 1)
    equal(sessions[0]!.current, true)
    equal(sessions[0]!.id, currentSessionId.get())
    deepEqual(sessions[0]!.method, { name: 'Apple Passwords', type: 'passkey' })

    let response = await server.fetch('/sessions', {
      body: JSON.stringify({
        password: { authKey: password.slice(0, 22) },
        userId: userId.get()
      }),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) Firefox/140.0'
      },
      method: 'POST'
    })
    await waitFor(page.sessions, list => ready(list)?.length === 2)
    let otherItem = ready(page.sessions.get())![1]!
    equal(otherItem.browser, 'Firefox')
    equal(otherItem.os, 'Linux')
    equal(otherItem.current, false)
    equal(otherItem.online, false)
    deepEqual(otherItem.method, { type: 'password' })

    let { session } = (await response.json()) as { session: string }
    await server.connect(userId.get()!, { token: session })
    await waitFor(page.sessions, list => !!ready(list)?.[1]?.online)

    let otherPopup = openTestPopup('session', otherItem.id)
    await waitLoading(otherPopup.loading)
    let loadedOther = checkLoadedPopup(otherPopup)
    equal(loadedOther.session.get()?.browser, 'Firefox')
    await loadedOther.signOut()
    equal(router.get().popups.length, 0)
    await waitFor(page.sessions, list => ready(list)?.length === 1)

    await server.fetch('/sessions', {
      body: JSON.stringify({
        password: { authKey: password.slice(0, 22) },
        userId: userId.get()
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST'
    })
    await server.fetch('/sessions', {
      body: JSON.stringify({
        password: { authKey: password.slice(0, 22) },
        userId: userId.get()
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST'
    })
    await waitFor(page.sessions, list => ready(list)?.length === 3)
    await page.deleteOtherSessions()
    await waitFor(page.sessions, list => ready(list)?.length === 1)

    let currentPopup = openTestPopup('session', currentSessionId.get()!)
    await waitLoading(currentPopup.loading)
    await checkLoadedPopup(currentPopup).signOut()
    equal(userId.get(), undefined)
  })

  test('shows not found popups', async () => {
    let { page } = await signUpCloud()
    let unknownPasskey = openTestPopup('passkey', 'unknown')
    await waitLoading(unknownPasskey.loading)
    equal(unknownPasskey.notFound, true)
    let unknownSession = openTestPopup('session', 'unknown')
    await waitLoading(unknownSession.loading)
    equal(unknownSession.notFound, true)
    closeLastPopup()
    closeLastPopup()

    let id = ready(page.passkeys.get())![0]!.id
    hasCloud.set(false)
    let local = openTestPopup('passkey', id)
    await waitLoading(local.loading)
    equal(local.notFound, true)
    let localSession = openTestPopup('session', id)
    await waitLoading(localSession.loading)
    equal(localSession.notFound, true)
  })
})
