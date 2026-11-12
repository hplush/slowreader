import { encodeTelegramApp } from '@slowreader/api'
import { deepEqual, equal, rejects } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  accountsMessages,
  addAccount,
  createDownloadTask,
  createTextResponse,
  deviceSessions,
  loaders,
  loadFeeds,
  syncFollows,
  type TelegramObject,
  testAccount,
  testFeed,
  UserFacingError
} from '../../index.ts'
import type { SignInStep } from '../../loader/common.ts'
import {
  loadTelegramApp,
  sendToTelegram,
  telegramApp
} from '../../loader/telegram.ts'
import {
  checkAndRemoveRequestMock,
  cleanClient,
  expectRequest,
  mockRequest,
  sendTelegramUpdate,
  startClient,
  testTelegram,
  testTelegramCreator
} from '../utils.ts'

const USER = {
  '@type': 'user',
  'first_name': 'Jane',
  'id': 100,
  'last_name': 'Doe',
  'usernames': { '@type': 'usernames', 'active_usernames': ['jane', 'old'] }
}

function state(type: string, fields: object = {}): TelegramObject {
  return {
    '@type': 'updateAuthorizationState',
    'authorization_state': { '@type': `authorizationState${type}`, ...fields }
  }
}

function moveTo(type: string, fields?: object): () => TelegramObject {
  return () => {
    sendTelegramUpdate(state(type, fields))
    return { '@type': 'ok' }
  }
}

function fail(message: string, code = 400): TelegramObject {
  return { '@type': 'error', code, message }
}

function getName(step: SignInStep<unknown>): string {
  if (step.type !== 'ask') throw new Error(`Step is ${step.type}`)
  return (step.data as { name: string }).name
}

describe('telegram loader', () => {
  let account = loaders.telegram.account!
  let task = createDownloadTask()

  beforeEach(() => {
    startClient({ telegramCreator: testTelegramCreator })
    telegramApp.set({ apiHash: 'hash', apiId: 1 })
    deviceSessions.set({})
    mockRequest()
  })

  afterEach(async () => {
    await cleanClient()
    telegramApp.set(undefined)
    deviceSessions.set({})
    checkAndRemoveRequestMock()
  })

  test('signs in by code and password', async () => {
    let t = accountsMessages.get()
    testTelegram.answers.setAuthenticationPhoneNumber = moveTo('WaitCode')
    let code = await account.startSignIn(task, '+34 (600) 000-000')
    let name = getName(code)
    deepEqual(code, {
      data: { name },
      field: 'code',
      label: undefined,
      type: 'ask'
    })
    deepEqual(testTelegram.requests, [
      {
        '@type': 'setAuthenticationPhoneNumber',
        'phone_number': '+34600000000'
      }
    ])

    testTelegram.answers.checkAuthenticationCode = fail('PHONE_CODE_INVALID')
    await rejects(
      account.continueSignIn(task, code.data, { type: 'input', value: '1' }),
      new UserFacingError(t.invalidCode)
    )
    testTelegram.answers.checkAuthenticationCode = fail('PHONE_CODE_EXPIRED')
    await rejects(
      account.continueSignIn(task, code.data, { type: 'input', value: '1' }),
      new UserFacingError(t.expiredCode)
    )

    // TDLib can send the update after the answer
    testTelegram.answers.checkAuthenticationCode = () => {
      void setTimeout(10).then(() => {
        sendTelegramUpdate(state('WaitPassword'))
      })
      return { '@type': 'ok' }
    }
    let password = await account.continueSignIn(task, code.data, {
      type: 'input',
      value: ' 12345 '
    })
    deepEqual(password, { data: { name }, field: 'password', type: 'ask' })
    deepEqual(testTelegram.requests.at(-1), {
      '@type': 'checkAuthenticationCode',
      'code': '12345'
    })

    testTelegram.answers.checkAuthenticationPassword = fail(
      'PASSWORD_HASH_INVALID'
    )
    await rejects(
      account.continueSignIn(task, code.data, { type: 'input', value: 'no' }),
      new UserFacingError(t.invalidPassword)
    )

    testTelegram.answers.checkAuthenticationPassword = moveTo('Ready')
    testTelegram.answers.getMe = USER
    deepEqual(
      await account.continueSignIn(task, code.data, {
        type: 'input',
        value: 'secret'
      }),
      {
        account: {
          handle: '@jane',
          server: 'https://t.me',
          title: 'Jane Doe',
          url: 'tg://user?id=100'
        },
        device: name,
        type: 'done'
      }
    )
    deepEqual(testTelegram.requests.at(-2), {
      '@type': 'checkAuthenticationPassword',
      'password': 'secret'
    })
    deepEqual(testTelegram.destroyed, [])
  })

  test('tells where Telegram sent the code', async () => {
    let t = accountsMessages.get()
    for (let [type, label] of [
      ['TelegramMessage', t.codeFromApp],
      ['Sms', t.codeFromSms],
      ['SmsWord', t.codeFromSms],
      ['Call', t.codeFromCall],
      ['Fragment', t.codeFromFragment],
      ['FirebaseIos', undefined]
    ] as const) {
      testTelegram.answers.setAuthenticationPhoneNumber = moveTo('WaitCode', {
        code_info: {
          '@type': 'authenticationCodeInfo',
          'type': { '@type': `authenticationCodeType${type}` }
        }
      })
      let step = await account.startSignIn(task, '+34600000000')
      equal(step.type === 'ask' ? step.label : step.type, label)
      await account.cancelSignIn!({ name: getName(step) })
    }
  })

  test('signs in by email code to account without username', async () => {
    testTelegram.answers.setAuthenticationPhoneNumber = moveTo('WaitEmailCode')
    let step = await account.startSignIn(task, '+34600000000')
    let name = getName(step)
    deepEqual(step, { data: { name }, field: 'emailCode', type: 'ask' })

    testTelegram.answers.checkAuthenticationEmailCode = moveTo('Ready')
    testTelegram.answers.getMe = {
      '@type': 'user',
      'first_name': 'Jane',
      'id': 100,
      'last_name': ''
    }
    deepEqual(
      await account.continueSignIn(
        task,
        { name },
        { type: 'input', value: '123' }
      ),
      {
        account: {
          handle: 'Jane',
          server: 'https://t.me',
          title: 'Jane',
          url: 'tg://user?id=100'
        },
        device: name,
        type: 'done'
      }
    )
    deepEqual(testTelegram.requests.at(-2), {
      '@type': 'checkAuthenticationEmailCode',
      'code': { '@type': 'emailAddressAuthenticationCode', 'code': '123' }
    })
  })

  test('deletes session key on wrong phone', async () => {
    let t = accountsMessages.get()
    testTelegram.answers.setAuthenticationPhoneNumber = fail(
      'PHONE_NUMBER_INVALID'
    )
    await rejects(
      account.startSignIn(task, 'phone'),
      new UserFacingError(t.invalidPhone)
    )
    equal(testTelegram.destroyed.length, 1)

    testTelegram.answers.setAuthenticationPhoneNumber = fail(
      'Too Many Requests: retry after 100',
      429
    )
    await rejects(
      account.startSignIn(task, '+34600000000'),
      new UserFacingError(t.tooManyAttempts)
    )
    testTelegram.answers.setAuthenticationPhoneNumber =
      fail('PHONE_NUMBER_FLOOD')
    await rejects(
      account.startSignIn(task, '+34600000000'),
      new UserFacingError(t.tooManyAttempts)
    )

    testTelegram.answers.setAuthenticationPhoneNumber = fail('INTERNAL', 500)
    await rejects(account.startSignIn(task, '+34600000000'), {
      message: 'INTERNAL',
      name: 'TelegramError'
    })
    delete testTelegram.answers.setAuthenticationPhoneNumber
    await rejects(account.startSignIn(task, '+34600000000'), {
      message: 'No Telegram answer for setAuthenticationPhoneNumber'
    })
    equal(testTelegram.destroyed.length, 5)
  })

  test('sends unsupported steps to the official app', async () => {
    testTelegram.answers.setAuthenticationPhoneNumber =
      moveTo('WaitRegistration')
    await rejects(
      account.startSignIn(task, '+34600000000'),
      new UserFacingError(accountsMessages.get().telegramOfficialApp)
    )
    equal(testTelegram.destroyed.length, 1)
  })

  test('deletes session key of canceled sign in', async () => {
    testTelegram.answers.setAuthenticationPhoneNumber = moveTo('WaitCode')
    let name = getName(await account.startSignIn(task, '+34600000000'))
    await account.cancelSignIn!({ name })
    deepEqual(testTelegram.destroyed, [name])
  })

  test('keeps TDLib running only during sign in and requests', async t => {
    testTelegram.answers.setAuthenticationPhoneNumber = moveTo('WaitCode')
    testTelegram.answers.checkAuthenticationCode = moveTo('Ready')
    testTelegram.answers.getMe = USER
    let name = getName(await account.startSignIn(task, '+34600000000'))

    t.mock.timers.enable({ apis: ['setTimeout'] })
    t.mock.timers.tick(60_000)
    equal(testTelegram.running.has(name), true)

    await account.continueSignIn(task, { name }, { type: 'input', value: '1' })
    t.mock.timers.tick(59_000)
    equal(testTelegram.running.has(name), true)
    await sendToTelegram(name, { '@type': 'getMe' })
    t.mock.timers.tick(59_000)
    equal(testTelegram.running.has(name), true)
    t.mock.timers.tick(1000)
    equal(testTelegram.running.has(name), false)

    await sendToTelegram(name, { '@type': 'getMe' })
    equal(testTelegram.running.has(name), true)
    t.mock.timers.reset()
    await cleanClient()
    equal(testTelegram.running.has(name), false)
  })

  test('ends device session', async () => {
    testTelegram.answers.setAuthenticationPhoneNumber = moveTo('Ready')
    testTelegram.answers.getMe = USER
    testTelegram.answers.logOut = moveTo('LoggingOut')
    let step = await account.startSignIn(task, '+34600000000')
    if (step.type !== 'done') throw new Error('Sign in was not finished')
    deviceSessions.set({ id: { device: step.device!, service: 'telegram' } })

    await account.endDeviceSession!(step.device!)
    deepEqual(testTelegram.requests.at(-1), { '@type': 'logOut' })
    deepEqual(testTelegram.destroyed, [step.device])

    // Telegram is not available, but the session key must be deleted
    delete testTelegram.answers.logOut
    await account.endDeviceSession!('offline')
    deepEqual(testTelegram.destroyed, [step.device, 'offline'])
  })

  test('forgets session, which user ended in Telegram', async () => {
    testTelegram.answers.setAuthenticationPhoneNumber = moveTo('Ready')
    testTelegram.answers.getMe = USER
    let step = await account.startSignIn(task, '+34600000000')
    if (step.type !== 'done') throw new Error('Sign in was not finished')
    deviceSessions.set({
      another: { device: 'another', service: 'telegram' },
      id: { device: step.device!, service: 'telegram' }
    })

    sendTelegramUpdate({ '@type': 'updateOption' }, step.device)
    sendTelegramUpdate({ '@type': 'updateAuthorizationState' }, step.device)
    deepEqual(testTelegram.destroyed, [])

    sendTelegramUpdate(state('LoggingOut'), step.device)
    deepEqual(deviceSessions.get(), {
      another: { device: 'another', service: 'telegram' }
    })
    deepEqual(testTelegram.destroyed, [step.device])
  })

  test('loads app ID from the server', async () => {
    telegramApp.set(undefined)
    await rejects(sendToTelegram('name', { '@type': 'getMe' }), {
      message: 'No Telegram on this client'
    })

    let encoded = JSON.stringify(
      encodeTelegramApp({ apiHash: 'hash', apiId: 2 })
    )
    equal(encoded.includes('hash'), false)
    expectRequest('/telegram-app.json').andRespond(
      200,
      encoded,
      'application/json'
    )
    await loadTelegramApp()
    deepEqual(telegramApp.get(), { apiHash: 'hash', apiId: 2 })

    expectRequest('/telegram-app.json').andFail()
    await loadTelegramApp()
    deepEqual(telegramApp.get(), { apiHash: 'hash', apiId: 2 })

    for (let wrong of ['{}', '"not base64"', JSON.stringify(btoa('wrong'))]) {
      telegramApp.set({ apiHash: 'hash', apiId: 2 })
      expectRequest('/telegram-app.json').andRespond(
        200,
        wrong,
        'application/json'
      )
      await loadTelegramApp()
      equal(telegramApp.get(), undefined)
    }

    telegramApp.set({ apiHash: 'hash', apiId: 2 })
    expectRequest('/telegram-app.json').andRespond(404)
    await loadTelegramApp()
    equal(telegramApp.get(), undefined)

    await cleanClient()
    startClient()
    await loadTelegramApp()
    telegramApp.set({ apiHash: 'hash', apiId: 2 })
    await rejects(sendToTelegram('name', { '@type': 'getMe' }), {
      message: 'No Telegram on this client'
    })
  })

  function mockChats(usernames: Record<number, string[]>): void {
    let parts = 2
    testTelegram.answers.loadChats = () => {
      parts -= 1
      return parts >= 0 ? { '@type': 'ok' } : fail('Not Found', 404)
    }
    testTelegram.answers.getChats = {
      '@type': 'chats',
      'chat_ids': [-1001, -1002, -1003, 4],
      'total_count': 4
    }
    testTelegram.answers.getChat = ({ chat_id: id }) => ({
      '@type': 'chat',
      id,
      'last_message': { '@type': 'message', 'id': 1 },
      'title': `Chat ${String(id)}`,
      'type':
        id === 4
          ? { '@type': 'chatTypePrivate', 'user_id': 4 }
          : {
              '@type': 'chatTypeSupergroup',
              'is_channel': id !== -1003,
              'supergroup_id': -1000 - Number(id)
            }
    })
    testTelegram.answers.getSupergroup = ({ supergroup_id: id }) => ({
      '@type': 'supergroup',
      id,
      'is_channel': true,
      'usernames': {
        '@type': 'usernames',
        'active_usernames': usernames[Number(id)] ?? []
      }
    })
  }

  test('loads only channels from the chat list', async () => {
    let auth = {
      account: testAccount({ credentials: null, service: 'telegram' }),
      device: 'name',
      expire: () => Promise.resolve(),
      reload: () => Promise.resolve(undefined),
      save: () => Promise.resolve()
    }
    mockChats({ 1: ['news', 'old'] })
    deepEqual(await account.getFollows(task, auth), [
      {
        loaderData: '{"id":"-1001"}',
        title: 'Chat -1001',
        url: 'https://t.me/news'
      },
      {
        loaderData: '{"id":"-1002"}',
        title: 'Chat -1002',
        url: 'https://t.me/c/2'
      }
    ])
    deepEqual(
      testTelegram.requests.map(i => i['@type']),
      [
        'loadChats',
        'loadChats',
        'loadChats',
        'getChats',
        'getChat',
        'getChat',
        'getChat',
        'getChat',
        'getSupergroup',
        'getSupergroup'
      ]
    )
    equal(loaders.telegram.getOriginId!('{"id":"-1001"}'), '-1001')

    testTelegram.answers.loadChats = fail('FLOOD_WAIT_5', 429)
    await rejects(account.getFollows(task, auth), { name: 'TelegramError' })
    await rejects(account.getFollows(task, { ...auth, device: undefined }), {
      message: 'No Telegram session on this device'
    })
  })

  test('keeps the feed of the channel after its username change', async () => {
    let accountId = await addAccount(
      testAccount({ credentials: null, service: 'telegram' })
    )
    deviceSessions.set({ [accountId]: { device: 'name', service: 'telegram' } })

    mockChats({ 1: ['news'] })
    await syncFollows('telegram')
    let feeds = await loadFeeds()
    deepEqual(
      new Set(feeds.map(feed => `${feed.loader} ${feed.title} ${feed.url}`)),
      new Set([
        'telegram Chat -1001 https://t.me/news',
        'telegram Chat -1002 https://t.me/c/2'
      ])
    )

    mockChats({ 1: ['renamed'] })
    await syncFollows('telegram')
    let renamed = await loadFeeds()
    equal(renamed.length, 2)
    equal(
      renamed.find(feed => feed.url === 'https://t.me/renamed')!.id,
      feeds.find(feed => feed.url === 'https://t.me/news')!.id
    )
  })

  test('has no posts yet', async () => {
    let auth = {
      account: testAccount({ credentials: null, service: 'telegram' }),
      device: 'name',
      expire: () => Promise.resolve(),
      reload: () => Promise.resolve(undefined),
      save: () => Promise.resolve()
    }
    let url = 'https://t.me/channel'
    equal(await account.isFollowing(task, auth, url), false)
    await rejects(account.follow(task, auth, url))
    await rejects(account.unfollow(task, auth, url))
    let timeline = account.getTimeline(task, auth)
    await timeline.loading
    deepEqual(timeline.get().list, [])

    let { telegram } = loaders
    let page = createTextResponse('', { url })
    equal(telegram.isMineUrl(new URL(url), task), false)
    equal(telegram.detectFeedInPage(page, task, url), false)
    deepEqual(telegram.getMineLinksFromText(page), [])
    deepEqual(telegram.getSuggestedLinksFromText(page), [])
    equal(await telegram.loadFeedData(task, url), undefined)
    equal(await telegram.getPostSource(testFeed(), '1'), undefined)
    let posts = telegram.getPosts(task, url)
    await posts.loading
    deepEqual(posts.get().list, [])
  })
})
