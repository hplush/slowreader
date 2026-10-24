import { restoreAll, spyOn } from 'nanospy'
import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addAccount,
  addCategory,
  GENERAL_CATEGORY,
  getTables,
  loaders,
  openedPopups,
  testAccount,
  UserFacingError,
  waitLoading
} from '../../index.ts'
import {
  checkAndRemoveRequestMock,
  checkLoadedPopup,
  cleanClient,
  expectRequest,
  expectWarning,
  mockRequest,
  openTestPopup,
  startClient,
  testOAuthPages,
  waitUntil
} from '../utils.ts'

const PROFILE = 'https://mastodon.social/api/v1/accounts/verify_credentials'

function respondProfile(profile: Record<string, string>, status = 200): void {
  expectRequest(PROFILE).andRespond(
    status,
    JSON.stringify(profile),
    'application/json'
  )
}

async function openAccount(id: string): Promise<void> {
  let opened = openTestPopup('account', id)
  await waitLoading(opened.loading)
}

describe('account popup', () => {
  beforeEach(() => {
    startClient()
    mockRequest()
  })

  afterEach(async () => {
    restoreAll()
    await cleanClient()
    checkAndRemoveRequestMock()
  })

  test('changes and deletes account', async () => {
    let id = await addAccount(
      testAccount({
        follow: true,
        handle: '@user@mastodon.social',
        title: 'User'
      })
    )
    respondProfile({
      display_name: 'User',
      id: '1',
      url: 'https://mastodon.social/@user',
      username: 'user'
    })
    let opened = openTestPopup('account', id)
    await waitLoading(opened.loading)
    let popup = checkLoadedPopup(opened)
    deepEqual(popup.account.get(), {
      status: 'ready',
      value: await getTables().accounts.get(id)
    })
    equal(popup.follow.get(), true)
    deepEqual(popup.categories.get(), [
      [GENERAL_CATEGORY, 'General'],
      ['new', 'Add category…']
    ])

    let unbindFollow = popup.follow.listen(() => {})
    popup.follow.set(false)
    await waitUntil(async () => {
      return (await getTables().accounts.get(id))?.follow === false
    })
    equal(popup.account.get().value?.follow, false)

    await getTables().accounts.update(id, { follow: true })
    await waitUntil(() => popup.follow.get())

    let categoryId = await addCategory({ title: 'Social' })
    await popup.changeCategory(categoryId)
    equal((await getTables().accounts.get(id))?.categoryId, categoryId)

    unbindFollow()
    await popup.remove()
    equal(openedPopups.get().length, 0)
    equal(await getTables().accounts.get(id), undefined)
  })

  test('updates profile on opening', async () => {
    let mastodonId = await addAccount(
      testAccount({
        avatar: 'https://mastodon.social/old.png',
        handle: '@user@mastodon.social',
        title: 'Old'
      })
    )
    respondProfile({
      avatar: 'https://mastodon.social/new.png',
      display_name: 'New',
      id: '1',
      url: 'https://mastodon.social/@renamed',
      username: 'renamed'
    })
    await openAccount(mastodonId)
    await waitUntil(async () => {
      return (await getTables().accounts.get(mastodonId))?.title === 'New'
    })
    let mastodon = await getTables().accounts.get(mastodonId)
    equal(mastodon!.avatar, 'https://mastodon.social/new.png')
    equal(mastodon!.handle, '@renamed@mastodon.social')

    let blueskyId = await addAccount(
      testAccount({
        avatar: 'https://cdn.example.com/avatar.jpg',
        handle: '@user.bsky.social',
        server: 'https://pds.example.com',
        url: 'https://bsky.app/profile/did:plc:user',
        service: 'bluesky',
        title: 'User'
      })
    )
    expectRequest(
      'https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile' +
        '?actor=did%3Aplc%3Auser'
    ).andRespond(
      200,
      JSON.stringify({ did: 'did:plc:user', handle: 'user.bsky.social' }),
      'application/json'
    )
    await openAccount(blueskyId)
    await waitUntil(async () => {
      return (await getTables().accounts.get(blueskyId))?.avatar === null
    })
    equal(
      (await getTables().accounts.get(blueskyId))!.title,
      'user.bsky.social'
    )
  })

  test('keeps profile on errors', async () => {
    let id = await addAccount(
      testAccount({ handle: '@user@mastodon.social', title: 'User' })
    )
    respondProfile({}, 500)
    await openAccount(id)
    await waitUntil(() => openedPopups.get().length === 1)

    respondProfile({ id: '1', url: 'not URL', username: 'user' })
    await expectWarning(async () => {
      await openAccount(id)
      await waitUntil(() => openedPopups.get().length === 2)
      await setTimeout(50)
    }, [new TypeError('Invalid URL')])
    equal((await getTables().accounts.get(id))!.title, 'User')
  })

  test('shows not found for unknown account', async () => {
    let popup = openTestPopup('account', 'unknown')
    await waitLoading(popup.loading)
    equal(popup.notFound, true)
  })

  test('signs in again', async () => {
    let id = await addAccount(
      testAccount({
        handle: '@user@mastodon.social',
        server: 'https://mastodon.social'
      })
    )
    respondProfile({
      display_name: 'User',
      id: '1',
      url: 'https://mastodon.social/@user',
      username: 'user'
    })
    let opened = openTestPopup('account', id)
    await waitLoading(opened.loading)
    let popup = checkLoadedPopup(opened)

    let inputs: string[] = []
    spyOn(loaders.mastodon.account!, 'startSignIn', (task, input) => {
      inputs.push(input)
      if (inputs.length === 1) {
        return Promise.reject(new UserFacingError('Server is down'))
      }
      return Promise.resolve({
        data: {},
        state: 'STATE',
        type: 'open',
        url: 'https://mastodon.social/oauth/authorize'
      })
    })

    await popup.signInAgain()
    equal(popup.signInError.get(), 'Server is down')
    equal(popup.signingIn.get(), false)

    void popup.signInAgain()
    equal(popup.signingIn.get(), true)
    equal(popup.signInError.get(), undefined)
    await waitUntil(() => testOAuthPages.length > 0)
    deepEqual(inputs, ['https://mastodon.social', 'https://mastodon.social'])
    equal(testOAuthPages.at(-1), 'https://mastodon.social/oauth/authorize')
  })
})
