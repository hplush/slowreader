import { restoreAll, spyOn } from 'nanospy'
import { deepEqual, equal, ok } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  type AccountsPage,
  type AccountValue,
  accountsMessages,
  addCategory,
  busy,
  commonMessages,
  currentPage,
  deleteCategory,
  fatal,
  GENERAL_CATEGORY,
  getEnvironment,
  getTables,
  HTTPStatusError,
  loaders,
  openedPopups,
  ParseError,
  router,
  UserFacingError,
  waitLoading
} from '../../index.ts'
import { sha256 } from '../../lib/oauth.ts'
import { getBlueskyClientId } from '../../loader/bluesky.ts'
import {
  checkAndRemoveRequestMock,
  cleanClient,
  expectRequest,
  expectWarning,
  mockRequest,
  openPage,
  openRoute,
  restartClient,
  startClient,
  testHistory,
  testOAuthPages,
  waitFor,
  waitUntil
} from '../utils.ts'

const JSON_TYPE = 'application/json'

const MASTODON_METADATA = {
  authorization_endpoint: 'https://social.example.com/oauth/authorize',
  code_challenge_methods_supported: ['S256'],
  token_endpoint: 'https://social.example.com/oauth/token'
}

const BLUESKY_METADATA = {
  authorization_endpoint: 'https://auth.example.com/oauth/authorize',
  issuer: 'https://auth.example.com',
  pushed_authorization_request_endpoint: 'https://auth.example.com/oauth/par',
  token_endpoint: 'https://auth.example.com/oauth/token'
}

function respond(url: string, body: unknown, status = 200): void {
  expectRequest(url).andRespond(status, JSON.stringify(body), JSON_TYPE)
}

function fields(account: AccountValue | undefined): object {
  return Object.fromEntries(
    Object.entries(account!).filter(([key]) => {
      return key !== 'id' && !key.startsWith('updatedAt_')
    })
  )
}

function loadAccounts(): Promise<AccountValue[]> {
  return getTables().accounts.load`ORDER BY "title"`
}

function getPending(): { state: string; verifier: string } {
  let pending = JSON.parse(
    getEnvironment().persistentStore['slowreader:accountSignIn']!
  ) as { data: { verifier: string }; state: string }
  return { state: pending.state, verifier: pending.data.verifier }
}

function getAccountsPage(): AccountsPage {
  let page = currentPage.get()
  if (page.route !== 'accounts') throw new Error('Not accounts page')
  return page
}

function decodeJwt(part: string): Record<string, unknown> {
  let json = atob(part.replaceAll('-', '+').replaceAll('_', '/'))
  return JSON.parse(json) as Record<string, unknown>
}

async function checkDpop(
  init: RequestInit,
  url: string,
  nonce?: string
): Promise<void> {
  let proof = new Headers(init.headers).get('DPoP')!
  let [header, payload, signature] = proof.split('.') as [
    string,
    string,
    string
  ]
  let headerJson = decodeJwt(header) as {
    alg: string
    jwk: JsonWebKey
    typ: string
  }
  equal(headerJson.alg, 'ES256')
  equal(headerJson.typ, 'dpop+jwt')
  equal(headerJson.jwk.d, undefined)
  let payloadJson = decodeJwt(payload)
  equal(payloadJson.htm, 'POST')
  equal(payloadJson.htu, url)
  equal(payloadJson.nonce, nonce)
  equal(typeof payloadJson.jti, 'string')
  let key = await crypto.subtle.importKey(
    'jwk',
    headerJson.jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify']
  )
  let bytes = Uint8Array.from(
    atob(signature.replaceAll('-', '+').replaceAll('_', '/')),
    char => char.charCodeAt(0)
  )
  ok(
    await crypto.subtle.verify(
      { hash: 'SHA-256', name: 'ECDSA' },
      key,
      bytes,
      new TextEncoder().encode(`${header}.${payload}`)
    )
  )
}

/**
 * Web will never return from the redirect, the next page will take the code.
 */
async function submitUntilRedirect(page: AccountsPage): Promise<void> {
  let before = testOAuthPages.length
  void page.submit()
  await waitUntil(() => testOAuthPages.length > before)
}

async function startMastodon(
  input: string,
  register = true
): Promise<AccountsPage> {
  let page = openPage({ params: {}, route: 'accounts' })
  page.add('mastodon')
  page.input.set(input)
  respond(
    'https://social.example.com/.well-known/oauth-authorization-server',
    MASTODON_METADATA
  )
  if (register) {
    respond('https://social.example.com/api/v1/apps', {
      client_id: 'client',
      client_secret: 'secret'
    })
  }
  await submitUntilRedirect(page)
  return page
}

/**
 * The page is created again, like after the return from another site.
 */
function returnTo(hash: string): AccountsPage {
  openRoute({ params: {}, route: 'about' })
  restartClient({ hash, params: {}, route: 'accounts' })
  return getAccountsPage()
}

/**
 * Popup loads the profile again, so the test waits for its request.
 */
async function waitAccountPopup(): Promise<void> {
  await waitFor(router, route => route.popups.length > 0)
  await waitFor(openedPopups, popups => popups.length > 0)
  await waitLoading(openedPopups.get()[0]!.loading)
}

async function expectCrash(hash: string, error: Error): Promise<void> {
  await expectWarning(async () => {
    returnTo(hash)
    await waitFor(fatal, value => !!value)
  }, [error])
  deepEqual(fatal.get(), { error: String(error), type: 'crash' })
  fatal.set(undefined)
}

async function returnFromMastodon(
  profile: Record<string, string>
): Promise<AccountsPage> {
  let { state } = getPending()
  respond('https://social.example.com/oauth/token', { access_token: 'token' })
  respond(
    'https://social.example.com/api/v1/accounts/verify_credentials',
    profile
  )
  respond(
    'https://social.example.com/api/v1/accounts/verify_credentials',
    profile
  )
  let page = returnTo(`code=CODE&state=${state}`)
  await waitAccountPopup()
  return page
}

function startBluesky(input: string): AccountsPage {
  let page = openPage({ params: {}, route: 'accounts' })
  page.add('bluesky')
  page.input.set(input)
  respond(
    'https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle' +
      '?handle=user.bsky.social',
    { did: 'did:plc:user' }
  )
  respond('https://plc.directory/did:plc:user', {
    service: [
      { id: '#atproto_pds', serviceEndpoint: 'https://pds.example.com' }
    ]
  })
  respond('https://pds.example.com/.well-known/oauth-protected-resource', {
    authorization_servers: ['https://auth.example.com']
  })
  respond(
    'https://auth.example.com/.well-known/oauth-authorization-server',
    BLUESKY_METADATA
  )
  return page
}

describe('accounts page', () => {
  beforeEach(() => {
    startClient()
    mockRequest()
  })

  afterEach(async () => {
    await cleanClient()
    checkAndRemoveRequestMock()
  })

  test('signs in to Mastodon by handle', async () => {
    let page = openPage({ params: {}, route: 'accounts' })
    equal(page.step.get().type, 'list')
    page.add('mastodon')
    deepEqual(page.step.get(), {
      field: 'server',
      service: 'mastodon',
      type: 'form'
    })
    page.input.set(' @user@example.com ')

    expectRequest(
      'https://example.com/.well-known/webfinger?resource=' +
        encodeURIComponent('acct:user@example.com')
    ).andRespond(
      200,
      JSON.stringify({
        links: [
          {
            href: 'https://social.example.com/@user',
            rel: 'http://webfinger.net/rel/profile-page'
          }
        ]
      }),
      JSON_TYPE
    )
    respond(
      'https://social.example.com/.well-known/oauth-authorization-server',
      MASTODON_METADATA
    )
    let apps = expectRequest('https://social.example.com/api/v1/apps')
    apps.andRespond(
      200,
      JSON.stringify({ client_id: 'client', client_secret: 'secret' }),
      JSON_TYPE
    )
    await submitUntilRedirect(page)

    equal(page.submitting.get(), true)
    equal(page.error.get(), undefined)
    deepEqual(JSON.parse(apps.sent().body as string), {
      client_name: 'Slow Reader',
      redirect_uris: 'http://127.0.0.1:2553/settings/accounts',
      scopes: 'read write:follows',
      website: 'https://slowreader.app'
    })
    equal(testOAuthPages.length, 1)
    let url = new URL(testOAuthPages[0]!)
    equal(url.origin + url.pathname, MASTODON_METADATA.authorization_endpoint)
    let pending = getPending()
    deepEqual(Object.fromEntries(url.searchParams), {
      client_id: 'client',
      code_challenge: await sha256(pending.verifier),
      code_challenge_method: 'S256',
      redirect_uri: 'http://127.0.0.1:2553/settings/accounts',
      response_mode: 'fragment',
      response_type: 'code',
      scope: 'read write:follows',
      state: pending.state
    })

    let token = expectRequest('https://social.example.com/oauth/token')
    token.andRespond(200, JSON.stringify({ access_token: 'token' }), JSON_TYPE)
    let profile = expectRequest(
      'https://social.example.com/api/v1/accounts/verify_credentials'
    )
    profile.andRespond(
      200,
      JSON.stringify({
        avatar: 'https://social.example.com/avatar.png',
        display_name: 'User',
        id: '1',
        url: 'https://social.example.com/@user',
        username: 'user'
      }),
      JSON_TYPE
    )
    respond('https://social.example.com/api/v1/accounts/verify_credentials', {
      avatar: 'https://social.example.com/avatar.png',
      display_name: 'User',
      id: '1',
      url: 'https://social.example.com/@user',
      username: 'user'
    })
    let returned = returnTo(`code=CODE&state=${pending.state}`)
    deepEqual(busy.get(), {
      blocking: false,
      label: accountsMessages.get().authorizing,
      progress: undefined
    })
    deepEqual(testHistory.at(-1), { hash: '', params: {}, route: 'accounts' })
    await waitAccountPopup()

    deepEqual(Object.fromEntries(token.sent().body as URLSearchParams), {
      client_id: 'client',
      client_secret: 'secret',
      code: 'CODE',
      code_verifier: pending.verifier,
      grant_type: 'authorization_code',
      redirect_uri: 'http://127.0.0.1:2553/settings/accounts'
    })
    deepEqual(profile.sent().headers, { Authorization: 'Bearer token' })
    equal(
      getEnvironment().persistentStore['slowreader:accountSignIn'],
      undefined
    )

    let [account] = await loadAccounts()
    deepEqual(fields(account), {
      avatar: 'https://social.example.com/avatar.png',
      categoryId: GENERAL_CATEGORY,
      credentials: {
        accessToken: 'token',
        clientId: 'client',
        clientSecret: 'secret',
        tokenUrl: 'https://social.example.com/oauth/token'
      },
      follow: true,
      handle: '@user@social.example.com',
      lastOriginId: null,
      lastPublishedAt: null,
      refreshedAt: null,
      server: 'https://social.example.com',
      service: 'mastodon',
      title: 'User',
      url: 'https://social.example.com/@user'
    })
    equal(returned.step.get().type, 'list')
    equal(busy.get(), false)
    deepEqual(router.get(), {
      params: {},
      popups: [{ param: account!.id, popup: 'account' }],
      route: 'accounts'
    })

    let categoryId = await addCategory({ title: 'Social' })
    await getTables().accounts.update(account!.id, { categoryId })
    await deleteCategory(categoryId)
    equal((await loadAccounts())[0]!.categoryId, GENERAL_CATEGORY)
  })

  test('reuses Mastodon app and updates the same account', async () => {
    await startMastodon('https://social.example.com/@user')
    await returnFromMastodon({
      display_name: '',
      id: '1',
      url: 'https://social.example.com/@user',
      username: 'user'
    })
    let [first] = await loadAccounts()
    equal(first!.title, 'user')
    equal(first!.avatar, null)

    await startMastodon('social.example.com', false)
    await returnFromMastodon({
      display_name: 'New Name',
      id: '1',
      url: 'https://social.example.com/@user',
      username: 'user'
    })
    let updated = await loadAccounts()
    equal(updated.length, 1)
    equal(updated[0]!.id, first!.id)
    equal(updated[0]!.title, 'New Name')

    await startMastodon('social.example.com', false)
    await returnFromMastodon({
      display_name: 'Another',
      id: '1',
      url: 'https://social.example.com/@another',
      username: 'another'
    })
    let all = await loadAccounts()
    deepEqual(
      all.map(i => [i.title, i.follow]),
      [
        ['Another', false],
        ['New Name', true]
      ]
    )
  })

  test('checks Mastodon server', async () => {
    let page = openPage({ params: {}, route: 'accounts' })
    page.add('mastodon')

    page.input.set('not a server')
    await page.submit()
    equal(page.error.get(), accountsMessages.get().invalidServer)
    deepEqual(page.step.get(), {
      field: 'server',
      service: 'mastodon',
      type: 'form'
    })

    page.cancel()
    equal(page.step.get().type, 'list')
    equal(page.error.get(), undefined)
    equal(page.input.get(), '')
    page.add('mastodon')

    page.input.set('localhost')
    await page.submit()
    equal(page.error.get(), accountsMessages.get().invalidServer)

    page.input.set('old.example.com')
    expectRequest(
      'https://old.example.com/.well-known/oauth-authorization-server'
    ).andRespond(404)
    await page.submit()
    equal(page.error.get(), accountsMessages.get().oldMastodon)

    respond('https://old.example.com/.well-known/oauth-authorization-server', {
      ...MASTODON_METADATA,
      code_challenge_methods_supported: ['plain']
    })
    await page.submit()
    equal(page.error.get(), accountsMessages.get().oldMastodon)

    expectRequest(
      'https://old.example.com/.well-known/oauth-authorization-server'
    ).andFail()
    await page.submit()
    equal(page.error.get(), commonMessages.get().networkError)

    expectRequest(
      'https://old.example.com/.well-known/oauth-authorization-server'
    ).andRespond(500)
    await expectWarning(
      () => page.submit(),
      [
        new HTTPStatusError(
          500,
          'https://old.example.com/.well-known/oauth-authorization-server',
          '',
          new Headers()
        )
      ]
    )
  })

  test('signs in to Bluesky', async () => {
    let page = startBluesky('https://bsky.app/profile/User.bsky.social/')
    let firstPar = expectRequest('https://auth.example.com/oauth/par')
    firstPar.andRespond(
      400,
      JSON.stringify({ error: 'use_dpop_nonce' }),
      JSON_TYPE,
      { 'DPoP-Nonce': 'nonce1' }
    )
    let par = expectRequest('https://auth.example.com/oauth/par')
    par.andRespond(
      201,
      JSON.stringify({ request_uri: 'urn:request' }),
      JSON_TYPE
    )
    await submitUntilRedirect(page)

    equal(page.error.get(), undefined)
    equal(page.submitting.get(), true)
    let clientId = getBlueskyClientId(getEnvironment().oauthRedirect)
    equal(
      clientId,
      'http://localhost?redirect_uri=' +
        encodeURIComponent('http://127.0.0.1:2553/settings/accounts') +
        '&scope=atproto%20transition%3Ageneric'
    )
    let url = new URL(testOAuthPages[0]!)
    equal(url.origin + url.pathname, BLUESKY_METADATA.authorization_endpoint)
    deepEqual(Object.fromEntries(url.searchParams), {
      client_id: clientId,
      request_uri: 'urn:request'
    })
    let pending = getPending()
    deepEqual(Object.fromEntries(par.sent().body as URLSearchParams), {
      client_id: clientId,
      code_challenge: await sha256(pending.verifier),
      code_challenge_method: 'S256',
      login_hint: 'user.bsky.social',
      redirect_uri: 'http://127.0.0.1:2553/settings/accounts',
      response_mode: 'fragment',
      response_type: 'code',
      scope: 'atproto transition:generic',
      state: pending.state
    })
    await checkDpop(
      firstPar.sent(),
      BLUESKY_METADATA.pushed_authorization_request_endpoint
    )
    await checkDpop(
      par.sent(),
      BLUESKY_METADATA.pushed_authorization_request_endpoint,
      'nonce1'
    )

    expectRequest('https://auth.example.com/oauth/token').andRespond(
      400,
      JSON.stringify({ error: 'use_dpop_nonce' }),
      JSON_TYPE,
      { 'DPoP-Nonce': 'nonce2' }
    )
    let token = expectRequest('https://auth.example.com/oauth/token')
    token.andRespond(
      200,
      JSON.stringify({
        access_token: 'access',
        expires_in: 3600,
        refresh_token: 'refresh',
        sub: 'did:plc:user'
      }),
      JSON_TYPE
    )
    respond(
      'https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile' +
        '?actor=did%3Aplc%3Auser',
      { did: 'did:plc:user', handle: 'user.bsky.social' }
    )
    respond(
      'https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile' +
        '?actor=did%3Aplc%3Auser',
      { did: 'did:plc:user', handle: 'user.bsky.social' }
    )
    returnTo(
      `code=CODE&state=${pending.state}&iss=` +
        encodeURIComponent('https://auth.example.com')
    )
    await waitAccountPopup()
    await checkDpop(token.sent(), BLUESKY_METADATA.token_endpoint, 'nonce2')
    deepEqual(Object.fromEntries(token.sent().body as URLSearchParams), {
      client_id: clientId,
      code: 'CODE',
      code_verifier: pending.verifier,
      grant_type: 'authorization_code',
      redirect_uri: 'http://127.0.0.1:2553/settings/accounts'
    })

    let [account] = await loadAccounts()
    let proofKey = decodeJwt(
      new Headers(token.sent().headers).get('DPoP')!.split('.')[0]!
    ) as { jwk: JsonWebKey }
    equal(account!.credentials.dpopKey!.x, proofKey.jwk.x)
    ok(account!.credentials.dpopKey!.d)
    let expiresIn = account!.credentials.expiresAt! - Date.now() / 1000
    ok(expiresIn > 3590 && expiresIn <= 3601)
    deepEqual(
      fields({
        ...account!,
        credentials: { ...account!.credentials, dpopKey: null, expiresAt: 0 }
      }),
      {
        avatar: null,
        categoryId: GENERAL_CATEGORY,
        credentials: {
          accessToken: 'access',
          clientId,
          dpopKey: null,
          expiresAt: 0,
          refreshToken: 'refresh',
          tokenUrl: BLUESKY_METADATA.token_endpoint
        },
        follow: true,
        handle: '@user.bsky.social',
        lastOriginId: null,
        lastPublishedAt: null,
        refreshedAt: null,
        server: 'https://pds.example.com',
        service: 'bluesky',
        title: 'user.bsky.social',
        url: 'https://bsky.app/profile/did:plc:user'
      }
    )
  })

  test('saves Bluesky profile without token expiration', async () => {
    let page = startBluesky('user.bsky.social')
    respond('https://auth.example.com/oauth/par', { request_uri: 'urn:a' }, 201)
    await submitUntilRedirect(page)
    respond('https://auth.example.com/oauth/token', {
      access_token: 'access',
      refresh_token: 'refresh',
      sub: 'did:plc:user'
    })
    // Sign in and then the account popup load the profile
    for (let i = 0; i < 2; i++) {
      respond(
        'https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile' +
          '?actor=did%3Aplc%3Auser',
        {
          avatar: 'https://cdn.example.com/avatar.jpg',
          did: 'did:plc:user',
          displayName: 'User',
          handle: 'user.bsky.social'
        }
      )
    }
    returnTo(
      `code=CODE&state=${getPending().state}&iss=https://auth.example.com`
    )
    await waitAccountPopup()
    let [account] = await loadAccounts()
    equal(account!.title, 'User')
    equal(account!.avatar, 'https://cdn.example.com/avatar.jpg')
    equal(account!.credentials.expiresAt, undefined)
  })

  test('checks Bluesky handle', async () => {
    let page = openPage({ params: {}, route: 'accounts' })
    page.add('bluesky')
    deepEqual(page.step.get(), {
      field: 'handle',
      service: 'bluesky',
      type: 'form'
    })
    let resolve =
      'https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle' +
      '?handle=user.bsky.social'

    page.input.set('not handle')
    await page.submit()
    equal(page.error.get(), accountsMessages.get().invalidHandle)
    deepEqual(page.step.get(), {
      field: 'handle',
      service: 'bluesky',
      type: 'form'
    })

    page.input.set('@user.bsky.social')
    expectRequest(resolve).andRespond(400)
    await page.submit()
    equal(page.error.get(), accountsMessages.get().unknownHandle)

    respond(resolve, {})
    await page.submit()
    equal(page.error.get(), accountsMessages.get().unknownHandle)

    respond(resolve, { did: 'did:plc:user' })
    respond('https://plc.directory/did:plc:user', { service: [] })
    await page.submit()
    equal(page.error.get(), accountsMessages.get().unknownHandle)

    respond(resolve, { did: 'did:plc:user' })
    respond('https://plc.directory/did:plc:user', {
      service: [
        { id: '#atproto_pds', serviceEndpoint: 'https://pds.example.com' }
      ]
    })
    respond('https://pds.example.com/.well-known/oauth-protected-resource', {})
    await page.submit()
    equal(page.error.get(), accountsMessages.get().signInFailed)

    expectRequest(resolve).andRespond(500)
    await expectWarning(
      () => page.submit(),
      [new HTTPStatusError(500, resolve, '', new Headers())]
    )
    equal(page.error.get(), accountsMessages.get().signInFailed)

    startBluesky('user.bsky.social')
    expectRequest('https://auth.example.com/oauth/par').andRespond(
      400,
      JSON.stringify({ error: 'invalid_request' }),
      JSON_TYPE,
      { 'DPoP-Nonce': 'nonce' }
    )
    await expectWarning(
      () => page.submit(),
      [
        new HTTPStatusError(
          400,
          'https://auth.example.com/oauth/par',
          '',
          new Headers()
        )
      ]
    )

    startBluesky('user.bsky.social')
    expectRequest('https://auth.example.com/oauth/par').andRespond(
      400,
      'use_dpop_nonce',
      'text/plain'
    )
    await expectWarning(
      () => page.submit(),
      [
        new HTTPStatusError(
          400,
          'https://auth.example.com/oauth/par',
          '',
          new Headers()
        )
      ]
    )
  })

  test('cancels sign in on access deny', async () => {
    await startMastodon('social.example.com')
    let page = returnTo(`error=access_denied&state=${getPending().state}`)
    await waitFor(busy, value => !value)
    equal(page.step.get().type, 'list')
    equal(fatal.get(), undefined)
    deepEqual(router.get().popups, [])
    deepEqual(await loadAccounts(), [])
  })

  test('crashes on errors after the return', async () => {
    let lost = new Error('No data of the started sign in')
    await expectCrash('code=CODE&state=unknown', lost)

    await startMastodon('social.example.com')
    let store = getEnvironment().persistentStore
    let { state } = getPending()
    store['slowreader:accountSignIn'] = JSON.stringify({
      ...JSON.parse(store['slowreader:accountSignIn']!),
      startedAt: Date.now() - 11 * 60_000
    })
    await expectCrash(`code=CODE&state=${state}`, lost)

    await startMastodon('social.example.com', false)
    await expectCrash('code=CODE&state=wrong', lost)

    await startMastodon('social.example.com', false)
    await expectCrash(
      `error=server_error&error_description=Down&state=${getPending().state}`,
      new Error('Sign in error: Down')
    )

    await startMastodon('social.example.com', false)
    await expectCrash(
      `error=invalid_scope&state=${getPending().state}`,
      new Error('Sign in error: invalid_scope')
    )

    await startMastodon('social.example.com', false)
    expectRequest('https://social.example.com/oauth/token').andRespond(
      200,
      'not JSON',
      'text/plain'
    )
    await expectCrash(
      `code=CODE&state=${getPending().state}`,
      new ParseError('https://social.example.com/oauth/token is not JSON')
    )

    await startMastodon('social.example.com', false)
    respond('https://social.example.com/oauth/token', ['token'])
    await expectCrash(
      `code=CODE&state=${getPending().state}`,
      new ParseError('https://social.example.com/oauth/token is not object')
    )

    await startMastodon('social.example.com', false)
    respond('https://social.example.com/oauth/token', {})
    await expectCrash(
      `code=CODE&state=${getPending().state}`,
      new ParseError('No access_token in response')
    )

    let failed = new UserFacingError(accountsMessages.get().signInFailed)
    let bluesky = startBluesky('user.bsky.social')
    respond('https://auth.example.com/oauth/par', { request_uri: 'urn:a' }, 201)
    await submitUntilRedirect(bluesky)
    await expectCrash(
      `code=CODE&state=${getPending().state}&iss=https://evil.example.com`,
      failed
    )

    bluesky = startBluesky('user.bsky.social')
    respond('https://auth.example.com/oauth/par', { request_uri: 'urn:a' }, 201)
    await submitUntilRedirect(bluesky)
    respond('https://auth.example.com/oauth/token', {
      access_token: 'access',
      refresh_token: 'refresh',
      sub: 'did:plc:another'
    })
    await expectCrash(
      `code=CODE&state=${getPending().state}&iss=https://auth.example.com`,
      failed
    )
    deepEqual(await loadAccounts(), [])
  })

  test('asks more fields from the loader', async () => {
    let account = loaders.mastodon.account!
    let answers: unknown[] = []
    spyOn(account, 'startSignIn', (task, input) => {
      return Promise.resolve({
        data: { first: input },
        field: 'handle',
        type: 'ask'
      })
    })
    spyOn(account, 'continueSignIn', (task, data, answer) => {
      answers.push([data, answer])
      if (answer.type === 'input' && answer.value === 'wrong') {
        return Promise.reject(new UserFacingError('Wrong code'))
      }
      return Promise.resolve({
        account: {
          credentials: {
            accessToken: 'token',
            clientId: 'client',
            tokenUrl: 'https://mastodon.social/oauth/token'
          },
          handle: '@user@mastodon.social',
          server: 'https://mastodon.social',
          title: 'User',
          url: 'https://mastodon.social/@user'
        },
        type: 'done'
      })
    })

    let page = openPage({ params: {}, route: 'accounts' })
    page.add('mastodon')
    page.input.set('first')
    await page.submit()
    deepEqual(page.step.get(), {
      field: 'handle',
      service: 'mastodon',
      type: 'form'
    })
    equal(page.input.get(), '')

    page.input.set('wrong')
    await page.submit()
    equal(page.error.get(), 'Wrong code')
    equal(page.step.get().type, 'form')

    respond('https://mastodon.social/api/v1/accounts/verify_credentials', {
      display_name: 'User',
      id: '1',
      url: 'https://mastodon.social/@user',
      username: 'user'
    })
    page.input.set('right')
    await page.submit()
    await waitAccountPopup()
    equal(page.step.get().type, 'list')
    equal((await loadAccounts())[0]!.title, 'User')
    deepEqual(answers, [
      [{ first: 'first' }, { type: 'input', value: 'wrong' }],
      [{ first: 'first' }, { type: 'input', value: 'right' }]
    ])
    restoreAll()
  })

  test('takes Bluesky client from the app domain', () => {
    equal(
      getBlueskyClientId('https://slowreader.app/settings/accounts'),
      'https://slowreader.app/oauth/bluesky.json'
    )
  })
})
