import {
  encodeTelegramApp,
  refreshLocked,
  refreshUnlocked
} from '@slowreader/api'
import { keepMount } from 'nanostores'
import { deepEqual, equal, rejects } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  accountsMessages,
  addAccount,
  addFeed,
  addMessages,
  addPost,
  autoRefresh,
  cacheImages,
  cacheMediaOnRequest,
  cacheMediaReading,
  cacheVideos,
  changeAccount,
  chooseMediaCopy,
  closeLastPopup,
  createDownloadTask,
  createTextResponse,
  deletePost,
  deviceSessions,
  getClient,
  getLinkPopup,
  getPopupUrl,
  isMediaCached,
  lastRefresh,
  loaders,
  loadFeed,
  loadFeeds,
  loadMediaBlob,
  loadPageMedia,
  loadPost,
  loadPosts,
  mediaErrors,
  type OriginPost,
  refreshErrors,
  refreshPosts,
  refreshStatistics,
  refreshStatus,
  setupEnvironment,
  syncFollows,
  syncMediaCache,
  TelegramError,
  type TelegramObject,
  testAccount,
  testFeed,
  testPost,
  UserFacingError,
  waitLoading
} from '../../index.ts'
import type { SignInStep } from '../../loader/common.ts'
import {
  loadTelegramApp,
  sendToTelegram,
  telegramApp
} from '../../loader/telegram.ts'
import {
  checkAndRemoveRequestMock,
  checkLoadedPopup,
  cleanClient,
  expectRequest,
  expectWarning,
  getTestEnvironment,
  mockRequest,
  openPage,
  openTestPopup,
  sendTelegramUpdate,
  setTestNetwork,
  setTestVisibility,
  startClient,
  testTelegram,
  testTelegramCreator,
  waitUntil
} from '../utils.ts'

const USER = {
  '@type': 'user',
  'first_name': 'Jane',
  'id': 100,
  'last_name': 'Doe',
  'profile_photo': {
    '@type': 'profilePhoto',
    'small': { '@type': 'file', 'id': 61, 'remote': { unique_id: 'me-1' } }
  },
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
    let code = await account.startSignIn('+34 (600) 000-000')
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
      account.continueSignIn(code.data, { type: 'input', value: '1' }),
      new UserFacingError(t.invalidCode)
    )
    testTelegram.answers.checkAuthenticationCode = fail('PHONE_CODE_EXPIRED')
    await rejects(
      account.continueSignIn(code.data, { type: 'input', value: '1' }),
      new UserFacingError(t.expiredCode)
    )

    // TDLib can send the update after the answer
    testTelegram.answers.checkAuthenticationCode = () => {
      void setTimeout(10).then(() => {
        sendTelegramUpdate(state('WaitPassword'))
      })
      return { '@type': 'ok' }
    }
    let password = await account.continueSignIn(code.data, {
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
      account.continueSignIn(code.data, { type: 'input', value: 'no' }),
      new UserFacingError(t.invalidPassword)
    )

    testTelegram.answers.checkAuthenticationPassword = moveTo('Ready')
    testTelegram.answers.getMe = USER
    deepEqual(
      await account.continueSignIn(code.data, {
        type: 'input',
        value: 'secret'
      }),
      {
        account: {
          avatar: 'telegram:user/100/avatar/me-1',
          handle: '@jane',
          reading: 'slow',
          server: 'https://t.me',
          title: 'Jane Doe',
          url: 'tg://user?id=100'
        },
        device: name,
        type: 'done'
      }
    )
    deepEqual(testTelegram.requests.at(-3), {
      '@type': 'checkAuthenticationPassword',
      'password': 'secret'
    })
    deepEqual(testTelegram.requests.at(-2), {
      '@type': 'setOption',
      'name': 'online',
      'value': { '@type': 'optionValueBoolean', 'value': true }
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
      let step = await account.startSignIn('+34600000000')
      equal(step.type === 'ask' ? step.label : step.type, label)
      await account.cancelSignIn!({ name: getName(step) })
    }
  })

  test('signs in by email code to account without username', async () => {
    testTelegram.answers.setAuthenticationPhoneNumber = moveTo('WaitEmailCode')
    let step = await account.startSignIn('+34600000000')
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
      await account.continueSignIn({ name }, { type: 'input', value: '123' }),
      {
        account: {
          handle: 'Jane',
          reading: 'slow',
          server: 'https://t.me',
          title: 'Jane',
          url: 'tg://user?id=100'
        },
        device: name,
        type: 'done'
      }
    )
    deepEqual(testTelegram.requests.at(-3), {
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
      account.startSignIn('phone'),
      new UserFacingError(t.invalidPhone)
    )
    equal(testTelegram.destroyed.length, 1)

    testTelegram.answers.setAuthenticationPhoneNumber = fail(
      'Too Many Requests: retry after 100',
      429
    )
    await rejects(
      account.startSignIn('+34600000000'),
      new UserFacingError(t.tooManyAttempts)
    )
    testTelegram.answers.setAuthenticationPhoneNumber =
      fail('PHONE_NUMBER_FLOOD')
    await rejects(
      account.startSignIn('+34600000000'),
      new UserFacingError(t.tooManyAttempts)
    )

    testTelegram.answers.setAuthenticationPhoneNumber = fail('INTERNAL', 500)
    await rejects(account.startSignIn('+34600000000'), {
      message: 'INTERNAL',
      name: 'TelegramError'
    })
    delete testTelegram.answers.setAuthenticationPhoneNumber
    await rejects(account.startSignIn('+34600000000'), {
      message: 'No Telegram answer for setAuthenticationPhoneNumber'
    })
    equal(testTelegram.destroyed.length, 5)
  })

  test('sends unsupported steps to the official app', async () => {
    testTelegram.answers.setAuthenticationPhoneNumber =
      moveTo('WaitRegistration')
    await rejects(
      account.startSignIn('+34600000000'),
      new UserFacingError(accountsMessages.get().telegramOfficialApp)
    )
    equal(testTelegram.destroyed.length, 1)
  })

  test('deletes session key of canceled sign in', async () => {
    testTelegram.answers.setAuthenticationPhoneNumber = moveTo('WaitCode')
    let name = getName(await account.startSignIn('+34600000000'))
    await account.cancelSignIn!({ name })
    deepEqual(testTelegram.destroyed, [name])
  })

  test('keeps TDLib running on the screen, during sign in and requests', async t => {
    testTelegram.answers.setAuthenticationPhoneNumber = moveTo('WaitCode')
    testTelegram.answers.checkAuthenticationCode = moveTo('Ready')
    testTelegram.answers.getMe = USER
    testTelegram.answers.setOption = { '@type': 'ok' }
    setTestVisibility(false)
    let name = getName(await account.startSignIn('+34600000000'))

    t.mock.timers.enable({ apis: ['setTimeout'] })
    t.mock.timers.tick(60_000)
    equal(testTelegram.running.has(name), true)

    await account.continueSignIn({ name }, { type: 'input', value: '1' })
    t.mock.timers.tick(59_000)
    equal(testTelegram.running.has(name), true)
    await sendToTelegram(name, { '@type': 'getMe' })
    t.mock.timers.tick(59_000)
    equal(testTelegram.running.has(name), true)
    t.mock.timers.tick(1000)
    equal(testTelegram.running.has(name), false)

    let answer: (() => void) | undefined
    testTelegram.answers.getUser = () => {
      return new Promise(resolve => {
        answer = () => {
          resolve(USER)
        }
      })
    }
    let slow = sendToTelegram(name, { '@type': 'getUser' })
    await sendToTelegram(name, { '@type': 'getMe' })
    t.mock.timers.tick(60_000)
    let keptForSlow = testTelegram.running.has(name)
    answer!()
    await slow
    equal(keptForSlow, true)
    t.mock.timers.tick(60_000)
    equal(testTelegram.running.has(name), false)

    await sendToTelegram(name, { '@type': 'getMe' })
    setTestVisibility(true)
    t.mock.timers.tick(60_000)
    equal(testTelegram.running.has(name), true)
    await sendToTelegram(name, { '@type': 'getMe' })
    t.mock.timers.tick(60_000)
    equal(testTelegram.running.has(name), true)
    setTestVisibility(false)
    t.mock.timers.tick(60_000)
    equal(testTelegram.running.has(name), false)

    await sendToTelegram(name, { '@type': 'getMe' })
    equal(testTelegram.running.has(name), true)
    t.mock.timers.reset()
    await cleanClient()
    equal(testTelegram.running.has(name), false)
  })

  test('is online only on the screen and tells TDLib about another network', async () => {
    function getOnline(): unknown[] {
      return testTelegram.requests
        .filter(i => i['@type'] === 'setOption')
        .map(i => (i.value as { value: boolean }).value)
    }
    testTelegram.answers.getMe = USER
    await sendToTelegram('name', { '@type': 'getMe' })

    setTestVisibility(false)
    setTestNetwork({ type: 'free' })
    sendTelegramUpdate(state('Ready'))
    deepEqual(getOnline(), [])

    setTestVisibility(true)
    setTestVisibility(false)
    deepEqual(getOnline(), [true, false])
    function countNetworkTypes(): number {
      return testTelegram.requests.filter(i => i['@type'] === 'setNetworkType')
        .length
    }
    // Browser also tells about every change of the network speed
    setTestNetwork({ saveData: true, type: 'free' })
    setTestNetwork({ online: false, type: 'free' })
    equal(countNetworkTypes(), 0)
    setTestNetwork({ type: 'free' })
    deepEqual(testTelegram.requests.at(-1), {
      '@type': 'setNetworkType',
      'type': { '@type': 'networkTypeOther' }
    })
    setTestNetwork({ type: 'paid' })
    equal(countNetworkTypes(), 2)

    sendTelegramUpdate(state('Closed'))
    setTestVisibility(true)
    setTestNetwork({ type: 'free' })
    deepEqual(getOnline(), [true, false])
    equal(countNetworkTypes(), 2)
  })

  test('ends device session', async () => {
    testTelegram.answers.setAuthenticationPhoneNumber = moveTo('Ready')
    testTelegram.answers.getMe = USER
    testTelegram.answers.logOut = moveTo('LoggingOut')
    let step = await account.startSignIn('+34600000000')
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
    let step = await account.startSignIn('+34600000000')
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
    deepEqual(await account.getFollows(auth), [
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

    testTelegram.requests = []
    deepEqual((await account.getFollows(auth)).length, 2)
    equal(
      testTelegram.requests.some(i => i['@type'] === 'loadChats'),
      false
    )

    // TDLib forgets chats on restart
    sendTelegramUpdate(state('Closed'))
    testTelegram.answers.loadChats = fail('FLOOD_WAIT_5', 429)
    await rejects(account.getFollows(auth), { name: 'TelegramError' })
    await rejects(account.getFollows({ ...auth, device: undefined }), {
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

  function message(post: number, fields: object = {}): TelegramObject {
    return {
      '@type': 'message',
      'content': {
        '@type': 'messageText',
        'text': { '@type': 'formattedText', 'text': `Post ${post}` }
      },
      'date': 1000 + post,
      'edit_date': 0,
      'id': post * 1048576,
      'media_album_id': '0',
      ...fields
    }
  }

  function photo(album: string, caption: string): object {
    return {
      content: {
        '@type': 'messagePhoto',
        'caption': { '@type': 'formattedText', 'text': caption }
      },
      media_album_id: album
    }
  }

  function news(
    id: unknown,
    lastRead: number,
    fields: object = {}
  ): TelegramObject {
    return {
      '@type': 'chat',
      id,
      'last_read_inbox_message_id': lastRead * 1048576,
      'title': 'News',
      'type': {
        '@type': 'chatTypeSupergroup',
        'is_channel': true,
        'supergroup_id': -1e12 - Number(id)
      },
      ...fields
    }
  }

  function position(date: number, fields: object = {}): object {
    return {
      '@type': 'chatPosition',
      'is_pinned': false,
      'list': { '@type': 'chatListMain' },
      'order': String(BigInt(date) << 32n),
      ...fields
    }
  }

  /**
   * Real TDLib tells about every loaded chat by an update.
   */
  function mockChatList(...parts: TelegramObject[][]): void {
    testTelegram.answers.loadChats = () => {
      let part = parts.shift()
      if (!part) return fail('Not Found', 404)
      for (let chat of part) {
        sendTelegramUpdate({ '@type': 'updateNewChat', chat })
      }
      return { '@type': 'ok' }
    }
  }

  function getRequestTypes(): string[] {
    return testTelegram.requests.map(i => i['@type'])
  }

  function mockHistory(
    lastRead: number,
    pages: Record<number, TelegramObject[]>
  ): void {
    testTelegram.answers.getChat = ({ chat_id: id }) => news(id, lastRead)
    testTelegram.answers.getChatHistory = ({ from_message_id: from }) => ({
      '@type': 'messages',
      'messages': pages[Number(from) / 1048576] ?? []
    })
  }

  async function loadFeedPosts(
    loaderData = '{"id":"-1001"}'
  ): Promise<Partial<OriginPost>[]> {
    testTelegram.requests = []
    let posts = loaders.telegram.getPosts(
      task,
      'https://t.me/news',
      undefined,
      undefined,
      loaderData,
      {
        account: testAccount({ credentials: null, service: 'telegram' }),
        device: 'name',
        expire: () => Promise.resolve(),
        reload: () => Promise.resolve(undefined),
        save: () => Promise.resolve()
      }
    )
    await posts.loading
    while (posts.get().hasNext) await posts.next()
    if (posts.get().error) throw posts.get().error!
    return posts.get().list.map(post => {
      let copy: Partial<OriginPost> = { ...post }
      delete copy.id
      return copy
    })
  }

  function getHistoryRequests(): number[] {
    return testTelegram.requests
      .filter(i => i['@type'] === 'getChatHistory')
      .map(i => Number(i.from_message_id) / 1048576)
  }

  test('loads all posts of the channel and marks read ones', async () => {
    mockHistory(3, {
      0: [message(6)],
      4: [message(3), message(2)],
      6: [
        message(5, photo('album', '')),
        message(4, {
          ...photo('album', 'Album\n\nA & B\nline'),
          edit_date: 2000
        })
      ]
    })
    deepEqual(await loadFeedPosts(), [
      {
        full: '<p>Post 6</p>',
        originId: '6',
        publishedAt: 1006,
        url: 'https://t.me/news/6'
      },
      {
        full: '<p>Album</p><p>A &amp; B<br>line</p>',
        originId: '5',
        publishedAt: 1004,
        updatedAt: 2000,
        url: 'https://t.me/news/4'
      },
      {
        full: '<p>Post 3</p>',
        old: true,
        originId: '3',
        publishedAt: 1003,
        url: 'https://t.me/news/3'
      },
      {
        full: '<p>Post 2</p>',
        old: true,
        originId: '2',
        publishedAt: 1002,
        url: 'https://t.me/news/2'
      }
    ])
    deepEqual(getHistoryRequests(), [0, 6, 4, 2])
  })

  test('has 10 new posts in the channel, which was never opened', async () => {
    mockHistory(0, {
      0: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(post => message(post))
    })
    deepEqual(
      (await loadFeedPosts()).map(post => [post.originId, post.old]),
      [
        ['12', undefined],
        ['11', undefined],
        ['10', undefined],
        ['9', undefined],
        ['8', undefined],
        ['7', undefined],
        ['6', undefined],
        ['5', undefined],
        ['4', undefined],
        ['3', undefined],
        ['2', true],
        ['1', true]
      ]
    )
  })

  test('formats text of the post', async () => {
    let text =
      'Title 🚀\n\nSee example.com, @channel and #tag\n' +
      'Use <code> & link.\n\nQuoted text\n\nlet a = 1 < 2\n\n' +
      'mail a@b.c crossing'
    function entity(part: string, type: string, fields: object = {}): object {
      return {
        '@type': 'textEntity',
        'length': part.length,
        'offset': text.indexOf(part),
        'type': { '@type': `textEntityType${type}`, ...fields }
      }
    }
    mockHistory(0, {
      0: [
        message(1, {
          content: {
            '@type': 'messageText',
            'text': {
              '@type': 'formattedText',
              'entities': [
                entity('crossing', 'Strikethrough'),
                entity('Title 🚀', 'Bold'),
                entity('🚀', 'CustomEmoji', { custom_emoji_id: '1' }),
                entity('example.com', 'Url'),
                entity('@channel', 'Mention'),
                entity('#tag', 'Hashtag'),
                entity('Use', 'Spoiler'),
                entity('<code>', 'Code'),
                entity('link', 'TextUrl', {
                  url: 'https://example.com/?a=1&b=2'
                }),
                entity('link', 'Bold'),
                entity('Quoted text', 'BlockQuote'),
                entity('let a = 1 < 2', 'Pre'),
                entity('mail a@b', 'Underline'),
                entity('a@b.c', 'EmailAddress'),
                entity('crossing', 'Italic'),
                null
              ],
              text
            }
          }
        })
      ]
    })
    equal(
      (await loadFeedPosts())[0]!.full,
      '<p><b>Title 🚀</b></p>' +
        '<p>See <a href="https://example.com">example.com</a>, ' +
        '<a href="https://t.me/channel">@channel</a> and #tag<br>' +
        '<span class="spoiler">Use</span> <code>&lt;code&gt;</code> &amp; ' +
        '<a href="https://example.com/?a=1&amp;b=2"><b>link</b></a>.</p>' +
        '<blockquote>Quoted text</blockquote>' +
        '<pre>let a = 1 &lt; 2</pre>' +
        '<p><u>mail a@b</u>.c <s><i>crossing</i></s></p>'
    )

    mockHistory(0, {
      0: [
        message(1, {
          content: {
            '@type': 'messageText',
            'text': {
              '@type': 'formattedText',
              'entities': [
                {
                  '@type': 'textEntity',
                  'length': 5,
                  'offset': 0,
                  'type': { '@type': 'textEntityTypeEmailAddress' }
                }
              ],
              'text': 'a@b.c'
            }
          }
        })
      ]
    })
    equal(
      (await loadFeedPosts())[0]!.full,
      '<p><a href="mailto:a@b.c">a@b.c</a></p>'
    )
  })

  test('loads forwards, replies, link previews, and polls', async () => {
    function text(value: string): object {
      return { '@type': 'formattedText', 'entities': [], 'text': value }
    }
    function forward(origin: object): object {
      return { forward_info: { '@type': 'messageForwardInfo', origin } }
    }
    function reply(post: number, chat = -1001): object {
      return {
        reply_to: {
          '@type': 'messageReplyToMessage',
          'chat_id': chat,
          'message_id': post * 1048576
        }
      }
    }
    mockHistory(0, {
      0: [
        message(10, {
          content: {
            '@type': 'messagePoll',
            'poll': {
              '@type': 'poll',
              'options': [{ text: text('Yes') }, { text: text('No') }, {}],
              'question': text('Question?')
            }
          }
        }),
        message(9, {
          content: {
            '@type': 'messageText',
            'link_preview': {
              '@type': 'linkPreview',
              'description': text('Description'),
              'title': 'Title',
              'url': 'https://example.com/'
            },
            'text': text('With preview')
          }
        }),
        message(8, {
          content: {
            '@type': 'messageText',
            'link_preview': {
              '@type': 'linkPreview',
              'description': text(''),
              'title': '',
              'url': 'https://example.com/'
            },
            'text': text('Only photo in preview')
          },
          ...reply(1, -1002)
        }),
        message(
          7,
          forward({ '@type': 'messageOriginChannel', 'chat_id': -1005 })
        ),
        message(
          6,
          forward({ '@type': 'messageOriginUser', 'sender_user_id': 5 })
        ),
        message(
          5,
          forward({
            '@type': 'messageOriginHiddenUser',
            'sender_name': 'Hidden'
          })
        ),
        message(
          4,
          forward({ '@type': 'messageOriginChat', 'sender_chat_id': 6 })
        ),
        message(3, {
          ...forward({ '@type': 'messageOriginChannel', 'chat_id': -1009 }),
          ...reply(98)
        }),
        message(2, reply(1)),
        message(1, reply(99))
      ]
    })
    testTelegram.answers.getChat = ({ chat_id: id }) => {
      if (id === -1001) {
        return news(id, 0)
      } else if (id === -1005) {
        return {
          '@type': 'chat',
          'title': 'Source',
          'type': { '@type': 'chatTypeSupergroup', 'supergroup_id': 5 }
        }
      } else if (id === 6) {
        return {
          '@type': 'chat',
          'title': 'Group',
          'type': { '@type': 'chatTypeBasicGroup' }
        }
      } else {
        return fail('Chat not found')
      }
    }
    testTelegram.answers.loadChats = fail('Not Found', 404)
    testTelegram.answers.getSupergroup = {
      '@type': 'supergroup',
      'usernames': { '@type': 'usernames', 'active_usernames': ['source'] }
    }
    testTelegram.answers.getUser = USER
    testTelegram.answers.getMessages = {
      '@type': 'messages',
      'messages': [message(98), null]
    }

    let channel = { title: 'News', url: 'https://t.me/news' }
    deepEqual(
      (await loadFeedPosts()).map(post => ({
        author: post.author,
        full: post.full,
        poll: post.poll,
        preview: post.preview,
        replied: post.replied,
        repostedBy: post.repostedBy
      })),
      [
        {
          author: undefined,
          full: '<p>Question?</p>',
          poll: { options: [{ title: 'Yes' }, { title: 'No' }, { title: '' }] },
          preview: undefined,
          replied: undefined,
          repostedBy: undefined
        },
        {
          author: undefined,
          full: '<p>With preview</p>',
          poll: undefined,
          preview: {
            description: 'Description',
            title: 'Title',
            url: 'https://example.com/'
          },
          replied: undefined,
          repostedBy: undefined
        },
        {
          author: undefined,
          full: '<p>Only photo in preview</p>',
          poll: undefined,
          preview: undefined,
          replied: { missing: true },
          repostedBy: undefined
        },
        {
          author: { title: 'Source', url: 'https://t.me/source' },
          full: '<p>Post 7</p>',
          poll: undefined,
          preview: undefined,
          replied: undefined,
          repostedBy: channel
        },
        {
          author: {
            avatar: 'telegram:user/5/avatar/me-1',
            title: 'Jane Doe',
            url: 'https://t.me/jane'
          },
          full: '<p>Post 6</p>',
          poll: undefined,
          preview: undefined,
          replied: undefined,
          repostedBy: channel
        },
        {
          author: { title: 'Hidden' },
          full: '<p>Post 5</p>',
          poll: undefined,
          preview: undefined,
          replied: undefined,
          repostedBy: channel
        },
        {
          author: { title: 'Group', url: undefined },
          full: '<p>Post 4</p>',
          poll: undefined,
          preview: undefined,
          replied: undefined,
          repostedBy: channel
        },
        {
          author: undefined,
          full: '<p>Post 3</p>',
          poll: undefined,
          preview: undefined,
          replied: {
            full: '<p>Post 98</p>',
            missing: false,
            publishedAt: 1098,
            url: 'https://t.me/news/98'
          },
          repostedBy: undefined
        },
        {
          author: undefined,
          full: '<p>Post 2</p>',
          poll: undefined,
          preview: undefined,
          replied: {
            full: '<p>Post 1</p>',
            missing: false,
            publishedAt: 1001,
            url: 'https://t.me/news/1'
          },
          repostedBy: undefined
        },
        {
          author: undefined,
          full: '<p>Post 1</p>',
          poll: undefined,
          preview: undefined,
          replied: { missing: true },
          repostedBy: undefined
        }
      ]
    )
    // Replied post from the same page needs no request
    deepEqual(
      testTelegram.requests.filter(i => i['@type'] === 'getMessages'),
      [
        {
          '@type': 'getMessages',
          'chat_id': -1001,
          'message_ids': [98 * 1048576, 99 * 1048576]
        }
      ]
    )

    testTelegram.answers.getMessages = fail('Chat not found')
    deepEqual(
      (await loadFeedPosts()).map(post => post.replied?.missing),
      [
        undefined,
        undefined,
        true,
        undefined,
        undefined,
        undefined,
        undefined
      ].concat([true, false, true])
    )
    testTelegram.answers.getMessages = () => {
      throw new Error('TDLib is broken')
    }
    await rejects(loadFeedPosts(), { message: 'TDLib is broken' })
  })

  function file(id: number, size: number): object {
    return { '@type': 'file', id, size }
  }

  let photoPost = message(4, {
    content: {
      '@type': 'messagePhoto',
      'caption': { '@type': 'formattedText', 'text': 'Caption' },
      'photo': {
        '@type': 'photo',
        'minithumbnail': { '@type': 'minithumbnail', 'data': 'AAAA' },
        'sizes': [
          { height: 200, photo: file(11, 100), width: 320 },
          { height: 500, photo: file(12, 1000), width: 800 }
        ]
      }
    },
    media_album_id: 'album'
  })
  let videoPost = message(3, {
    content: {
      '@type': 'messageVideo',
      'has_spoiler': true,
      'video': {
        '@type': 'video',
        'height': 848,
        'mime_type': 'video/mp4',
        'thumbnail': {
          '@type': 'thumbnail',
          'file': file(21, 50),
          'format': { '@type': 'thumbnailFormatJpeg' },
          'height': 320,
          'width': 175
        },
        'video': file(22, 5000),
        'width': 464
      }
    },
    media_album_id: 'album'
  })
  let previewPost = message(5, {
    content: {
      '@type': 'messageText',
      'link_preview': {
        '@type': 'linkPreview',
        'title': '',
        'type': {
          '@type': 'linkPreviewTypePhoto',
          'photo': {
            '@type': 'photo',
            'sizes': [{ height: 450, photo: file(31, 300), width: 800 }]
          }
        },
        'url': 'https://example.com/'
      },
      'text': { '@type': 'formattedText', 'text': 'Link' }
    }
  })

  test('loads photos and videos of the post', async () => {
    mockHistory(0, {
      0: [
        message(7, {
          content: {
            '@type': 'messageVideoNote',
            'video_note': {
              '@type': 'videoNote',
              'length': 384,
              'thumbnail': {
                '@type': 'thumbnail',
                'file': file(41, 10),
                'format': { '@type': 'thumbnailFormatWebm' }
              },
              'video': file(42, 700)
            }
          }
        }),
        message(6, {
          content: {
            '@type': 'messageAnimation',
            'animation': {
              '@type': 'animation',
              'animation': file(51, 900),
              'height': 100,
              'mime_type': 'video/mp4',
              'width': 200
            }
          }
        }),
        previewPost,
        photoPost,
        videoPost,
        message(2, {
          ...videoPost,
          can_be_saved: false,
          id: 2 * 1048576,
          media_album_id: '0'
        })
      ]
    })
    let posts = await loadFeedPosts('{"id":"-1000000000005"}')
    deepEqual(
      posts.map(post => post.protected),
      [undefined, undefined, undefined, undefined, true]
    )
    deepEqual(
      posts.map(post => ({
        media: post.media,
        preview: post.preview,
        sizes: post.mediaSizes,
        text: post.full,
        unsupported: post.unsupported
      })),
      [
        {
          media: [{ type: 'video;mode=round', url: 'telegram:5/7' }],
          preview: undefined,
          sizes: [{ bytes: 700, height: 384, width: 384 }],
          text: undefined,
          unsupported: undefined
        },
        {
          media: [{ type: 'video;mode=gif', url: 'telegram:5/6' }],
          preview: undefined,
          sizes: [{ bytes: 900, height: 100, width: 200 }],
          text: undefined,
          unsupported: undefined
        },
        {
          media: undefined,
          preview: {
            image: 'telegram:5/5/preview',
            url: 'https://example.com/'
          },
          sizes: undefined,
          text: '<p>Link</p>',
          unsupported: undefined
        },
        {
          media: [
            {
              poster: 'telegram:5/3/poster',
              sensitive: true,
              type: 'video',
              url: 'telegram:5/3'
            },
            {
              placeholder: 'data:image/jpeg;base64,AAAA',
              type: 'image',
              url: 'telegram:5/4'
            }
          ],
          preview: undefined,
          sizes: [
            { bytes: 5000, height: 848, width: 464 },
            { bytes: 1000, height: 500, width: 800 }
          ],
          text: '<p>Caption</p>',
          unsupported: undefined
        },
        {
          media: [
            {
              poster: 'telegram:5/2/poster',
              sensitive: true,
              type: 'video',
              url: 'telegram:5/2'
            }
          ],
          preview: undefined,
          sizes: [{ bytes: 5000, height: 848, width: 464 }],
          text: undefined,
          unsupported: undefined
        }
      ]
    )
  })

  function plain(text: string): object {
    return { '@type': 'richTextPlain', text }
  }

  function styled(type: string, text: string, fields: object = {}): object {
    return { '@type': `richText${type}`, 'text': plain(text), ...fields }
  }

  function paragraph(...texts: object[]): object {
    return {
      '@type': 'pageBlockParagraph',
      'text': { '@type': 'richTexts', texts }
    }
  }

  function richPhoto(id: number, fields: object = {}): object {
    return {
      '@type': 'pageBlockPhoto',
      'has_spoiler': false,
      'photo': {
        '@type': 'photo',
        'minithumbnail': { '@type': 'minithumbnail', 'data': 'AAAA' },
        'sizes': [
          { height: 320, photo: file(id, 100), width: 320 },
          { height: 800, photo: file(id + 1, 1000), width: 800 }
        ]
      },
      'url': '',
      ...fields
    }
  }

  function rich(post: number, blocks: object[], full = true): TelegramObject {
    return message(post, {
      chat_id: -1000000000005,
      content: {
        '@type': 'messageRichMessage',
        'message': { '@type': 'richMessage', blocks, 'is_full': full }
      }
    })
  }

  test('gives smaller copies of a photo', async () => {
    deviceSessions.set({ own: { device: 'name', service: 'telegram' } })
    let sized = message(4, {
      content: {
        '@type': 'messagePhoto',
        'photo': {
          '@type': 'photo',
          'sizes': [
            { height: 60, photo: file(10, 10), type: 's', width: 100 },
            { height: 200, photo: file(11, 100), type: 'm', width: 320 },
            { height: 800, photo: file(13, 2000), type: 'y', width: 1280 },
            { height: 1600, photo: file(12, 5000), type: 'w', width: 2560 }
          ]
        }
      }
    })
    mockHistory(0, { 0: [sized] })
    let posts = await loadFeedPosts('{"id":"-1000000000005"}')
    deepEqual(posts[0]!.media, [
      {
        copies: [
          { url: 'telegram:5/4/y', width: 1280 },
          { url: 'telegram:5/4/m', width: 320 }
        ],
        type: 'image',
        url: 'telegram:5/4'
      }
    ])

    testTelegram.answers.getMessage = sized
    testTelegram.answers.downloadFile = ({ file_id: id }) => {
      return { '@type': 'file', id, 'size': 5 }
    }
    testTelegram.answers.deleteFile = { '@type': 'ok' }
    testTelegram.files = { 13: new Blob(['small']) }
    let copy = await loaders.telegram.getMedia!('telegram:5/4/y')!
    equal(await copy.text(), 'small')

    // A bigger copy from the memory is better than one more download
    let media = { copies: posts[0]!.media?.[0]?.copies, url: 'telegram:5/4' }
    equal(await chooseMediaCopy(media, 300), 'telegram:5/4/m')
    await loadMediaBlob('telegram:5/4/y')
    equal(await chooseMediaCopy(media, 300), 'telegram:5/4/y')

    // Nobody needs a copy after the best file was loaded
    testTelegram.files[12] = new Blob(['best'])
    await loadMediaBlob('telegram:5/4')
    equal(await chooseMediaCopy(media, 300), 'telegram:5/4')
    testTelegram.requests = []
    await loadMediaBlob('telegram:5/4/y')
    deepEqual(getDownloads(), [[16, true]])
  })

  test('loads posts with rich formatting', async () => {
    mockHistory(0, {
      0: [
        // Shortened real post
        rich(8, [
          paragraph(
            styled('Bold', 'Title!\n'),
            plain('\nShort text.\n\n'),
            styled('Url', 'Link', { url: 'https://example.com/' }),
            plain('!\n\nSecond.\n\n\n')
          ),
          {
            '@type': 'pageBlockCollage',
            'blocks': [richPhoto(61), richPhoto(63)]
          },
          paragraph(
            plain('\n\n'),
            styled('Bold', 'Why?'),
            plain('\n\nList:\n1. One\n2. Two\n\n-- \n'),
            styled('Url', 'Join', { url: 'https://t.me/news' }),
            plain(' | '),
            styled('Url', 'Best', { url: 'https://t.me/news/200' }),
            plain('\n'),
            styled('Spoiler', 'Bye')
          )
        ]),
        rich(7, [
          {
            '@type': 'pageBlockSectionHeading',
            'size': 2,
            'text': styled('Italic', 'Heading')
          },
          {
            '@type': 'pageBlockList',
            'items': [
              { blocks: [paragraph(plain('One'))], type: '1', value: 1 },
              { blocks: [paragraph(plain('Two'))], type: '1', value: 2 }
            ]
          },
          {
            '@type': 'pageBlockList',
            'items': [
              {
                blocks: [paragraph(plain('Done'))],
                has_checkbox: true,
                is_checked: true,
                type: ''
              },
              {
                blocks: [paragraph(plain('To do'))],
                has_checkbox: true,
                is_checked: false,
                type: ''
              }
            ]
          },
          {
            '@type': 'pageBlockBlockQuote',
            'blocks': [paragraph(plain('Quote'))],
            'credit': plain('Author')
          },
          { '@type': 'pageBlockPullQuote', 'text': plain('Pull') },
          {
            '@type': 'pageBlockPreformatted',
            'language': 'js',
            'text': styled('Bold', 'a < b')
          },
          { '@type': 'pageBlockMathematicalExpression', 'expression': 'x^2' },
          { '@type': 'pageBlockDivider' },
          {
            '@type': 'pageBlockTable',
            'caption': plain('Table'),
            'cells': [
              [
                { colspan: 2, is_header: true, rowspan: 1, text: plain('Head') }
              ],
              [
                { colspan: 1, rowspan: 1, text: plain('A') },
                { colspan: 1, rowspan: 2, text: styled('Fixed', 'B') }
              ]
            ]
          },
          {
            '@type': 'pageBlockDetails',
            'blocks': [paragraph(plain('Hidden'))],
            'header': plain('More'),
            'is_open': true
          },
          richPhoto(71, {
            caption: {
              '@type': 'pageBlockCaption',
              'credit': plain(''),
              'text': plain('Caption')
            }
          }),
          richPhoto(73, { has_spoiler: true }),
          {
            '@type': 'pageBlockVideo',
            'caption': { '@type': 'pageBlockCaption', 'text': plain('Video') },
            'video': {
              '@type': 'video',
              'height': 848,
              'mime_type': 'video/mp4',
              'thumbnail': {
                '@type': 'thumbnail',
                'file': file(75, 50),
                'format': { '@type': 'thumbnailFormatJpeg' }
              },
              'video': file(76, 5000),
              'width': 464
            }
          },
          { '@type': 'pageBlockAnchor', 'name': 'end' },
          paragraph(
            styled('Superscript', 'up'),
            styled('Marked', 'mark'),
            styled('EmailAddress', 'mail', { email_address: 'a@example.com' }),
            styled('Mention', '@news', { username: 'news' }),
            { '@type': 'richTextCustomEmoji', 'alternative_text': '🙂' },
            { '@type': 'richTextMathematicalExpression', 'expression': 'y^2' },
            {
              '@type': 'richTextBold',
              'text': styled('Italic', 'both')
            }
          ),
          { '@type': 'pageBlockFooter', 'footer': plain('Footer') }
        ]),
        rich(6, [paragraph(plain('Text')), { '@type': 'pageBlockMap' }]),
        {
          ...rich(5, [richPhoto(91), paragraph(plain('No saving'))]),
          can_be_saved: false
        }
      ]
    })
    let posts = await loadFeedPosts('{"id":"-1000000000005"}')
    deepEqual(
      posts.map(post => ({
        media: post.media,
        sizes: post.mediaSizes,
        text: post.full,
        unsupported: post.unsupported
      })),
      [
        {
          media: [
            {
              fromText: true,
              placeholder: 'data:image/jpeg;base64,AAAA',
              type: 'image',
              url: 'telegram:5/8/0'
            },
            {
              fromText: true,
              placeholder: 'data:image/jpeg;base64,AAAA',
              type: 'image',
              url: 'telegram:5/8/1'
            }
          ],
          sizes: [
            { bytes: 1000, height: 800, width: 800 },
            { bytes: 1000, height: 800, width: 800 }
          ],
          text:
            '<p><b>Title!</b></p>' +
            '<p>Short text.</p>' +
            '<p><a href="https://example.com/">Link</a>!</p>' +
            '<p>Second.</p>' +
            '<img src="telegram:5/8/0" alt="" width="800" height="800">' +
            '<img src="telegram:5/8/1" alt="" width="800" height="800">' +
            '<p><b>Why?</b></p>' +
            '<p>List:<br>1. One<br>2. Two</p>' +
            '<p>-- <br><a href="https://t.me/news">Join</a> | ' +
            '<a href="https://t.me/news/200">Best</a><br>' +
            '<span class="spoiler">Bye</span></p>',
          unsupported: undefined
        },
        {
          media: [
            {
              fromText: true,
              placeholder: 'data:image/jpeg;base64,AAAA',
              type: 'image',
              url: 'telegram:5/7/0'
            },
            {
              placeholder: 'data:image/jpeg;base64,AAAA',
              sensitive: true,
              type: 'image',
              url: 'telegram:5/7/1'
            },
            {
              poster: 'telegram:5/7/2/poster',
              type: 'video',
              url: 'telegram:5/7/2'
            }
          ],
          sizes: [
            { bytes: 1000, height: 800, width: 800 },
            { bytes: 1000, height: 800, width: 800 },
            { bytes: 5000, height: 848, width: 464 }
          ],
          text:
            '<h2><i>Heading</i></h2>' +
            '<ol><li><p>One</p></li><li><p>Two</p></li></ol>' +
            '<ul><li>☑ <p>Done</p></li><li>☐ <p>To do</p></li></ul>' +
            '<blockquote><p>Quote</p><p><cite>Author</cite></p></blockquote>' +
            '<blockquote><p>Pull</p></blockquote>' +
            '<pre>a &lt; b</pre>' +
            '<pre>x^2</pre>' +
            '<hr>' +
            '<table><caption>Table</caption>' +
            '<tr><th colspan="2">Head</th></tr>' +
            '<tr><td>A</td><td rowspan="2"><code>B</code></td></tr></table>' +
            '<details open><summary>More</summary><p>Hidden</p></details>' +
            '<figure>' +
            '<img src="telegram:5/7/0" alt="" width="800" height="800">' +
            '<figcaption>Caption</figcaption></figure>' +
            '<p>Video</p>' +
            '<p><sup>up</sup><mark>mark</mark>' +
            '<a href="mailto:a@example.com">mail</a>' +
            '<a href="https://t.me/news">@news</a>🙂<code>y^2</code>' +
            '<b><i>both</i></b></p>' +
            '<p>Footer</p>',
          unsupported: undefined
        },
        {
          media: undefined,
          sizes: undefined,
          text: '<p>Text</p>',
          unsupported: true
        },
        {
          media: [
            {
              placeholder: 'data:image/jpeg;base64,AAAA',
              type: 'image',
              url: 'telegram:5/5/0'
            }
          ],
          sizes: [{ bytes: 1000, height: 800, width: 800 }],
          text: '<p>No saving</p>',
          unsupported: undefined
        }
      ]
    )
  })

  test('shows music, voice messages, and documents by name', async () => {
    function document(name: string, type: string, size: number): object {
      return {
        '@type': 'messageDocument',
        'caption': { '@type': 'formattedText', 'text': '' },
        'document': {
          '@type': 'document',
          'document': file(62, size),
          'file_name': name,
          'mime_type': type
        }
      }
    }
    mockHistory(0, {
      0: [
        rich(9, [
          paragraph(plain('Listen')),
          {
            '@type': 'pageBlockAudio',
            'audio': {
              '@type': 'audio',
              'audio': file(65, 500),
              'file_name': 'track.flac',
              'mime_type': 'audio/flac',
              'performer': '',
              'title': ''
            },
            'caption': { '@type': 'pageBlockCaption', 'text': plain('Track') }
          }
        ]),
        message(8, {
          content: {
            '@type': 'messageAudio',
            'audio': {
              '@type': 'audio',
              'audio': file(61, 4000),
              'file_name': 'ave.mp3',
              'mime_type': 'audio/mpeg',
              'performer': 'Franz Schubert',
              'title': 'Ave Maria'
            },
            'caption': { '@type': 'formattedText', 'text': '' }
          }
        }),
        message(7, {
          content: {
            '@type': 'messageVoiceNote',
            'caption': { '@type': 'formattedText', 'text': 'Listen' },
            'voice_note': {
              '@type': 'voiceNote',
              'mime_type': 'audio/ogg',
              'voice': file(63, 300)
            }
          }
        }),
        message(6, {
          content: document('photo.png', 'image/png', 2000),
          media_album_id: 'files'
        }),
        message(5, {
          content: document('book.pdf', 'application/pdf', 1000),
          media_album_id: 'files'
        })
      ]
    })
    let posts = await loadFeedPosts('{"id":"-1000000000005"}')
    deepEqual(
      posts.map(post => ({
        media: post.media,
        sizes: post.mediaSizes,
        text: post.full,
        unsupported: post.unsupported
      })),
      [
        {
          media: [
            { name: 'track.flac', type: 'audio/flac', url: 'telegram:5/9/0' }
          ],
          sizes: [{ bytes: 500 }],
          text: '<p>Listen</p><p>Track</p>',
          unsupported: undefined
        },
        {
          media: [
            {
              name: 'Franz Schubert — Ave Maria',
              type: 'audio/mpeg',
              url: 'telegram:5/8'
            }
          ],
          sizes: [{ bytes: 4000 }],
          text: undefined,
          unsupported: undefined
        },
        {
          media: [{ type: 'audio/ogg', url: 'telegram:5/7' }],
          sizes: [{ bytes: 300 }],
          text: '<p>Listen</p>',
          unsupported: undefined
        },
        {
          media: [
            { name: 'book.pdf', type: 'application/pdf', url: 'telegram:5/5' },
            {
              name: 'photo.png',
              type: 'application/octet-stream',
              url: 'telegram:5/6'
            }
          ],
          sizes: [{ bytes: 1000 }, { bytes: 2000 }],
          text: undefined,
          unsupported: undefined
        }
      ]
    )
  })

  test('shows stickers and emoji posts', async () => {
    function sticker(
      post: number,
      format: string,
      preview?: string
    ): TelegramObject {
      return message(post, {
        content: {
          '@type': 'messageSticker',
          'sticker': {
            '@type': 'sticker',
            'emoji': '👍',
            'format': { '@type': `stickerFormat${format}` },
            'height': 400,
            'sticker': file(70 + post, 900),
            'thumbnail': preview
              ? {
                  '@type': 'thumbnail',
                  'file': file(80 + post, 50),
                  'format': { '@type': `thumbnailFormat${preview}` },
                  'height': 100,
                  'width': 128
                }
              : undefined,
            'width': 512
          }
        }
      })
    }
    let stickers: Record<number, TelegramObject> = {
      4: sticker(4, 'Tgs', 'Tgs'),
      5: sticker(5, 'Tgs', 'Webp'),
      6: sticker(6, 'Webm', 'Jpeg'),
      7: sticker(7, 'Webp')
    }
    mockHistory(0, {
      0: [
        message(9, {
          content: { '@type': 'messageDice', 'emoji': '🎲', 'value': 4 }
        }),
        message(8, {
          content: { '@type': 'messageAnimatedEmoji', 'emoji': '🎉' }
        }),
        stickers[7]!,
        stickers[6]!,
        stickers[5]!,
        stickers[4]!
      ]
    })
    let posts = await loadFeedPosts('{"id":"-1000000000005"}')
    deepEqual(
      posts.map(post => ({
        media: post.media,
        sizes: post.mediaSizes,
        text: post.full,
        unsupported: post.unsupported
      })),
      [
        {
          media: undefined,
          sizes: undefined,
          text: undefined,
          unsupported: true
        },
        {
          media: undefined,
          sizes: undefined,
          text: '<p>🎉</p>',
          unsupported: undefined
        },
        {
          media: [
            { alt: '👍', type: 'image;mode=sticker', url: 'telegram:5/7' }
          ],
          sizes: [{ bytes: 900, height: 400, width: 512 }],
          text: undefined,
          unsupported: undefined
        },
        {
          media: [
            { alt: '👍', type: 'image;mode=sticker', url: 'telegram:5/6' }
          ],
          sizes: [{ bytes: 50, height: 100, width: 128 }],
          text: undefined,
          unsupported: undefined
        },
        {
          media: [
            { alt: '👍', type: 'image;mode=sticker', url: 'telegram:5/5' }
          ],
          sizes: [{ bytes: 50, height: 100, width: 128 }],
          text: undefined,
          unsupported: undefined
        },
        {
          media: undefined,
          sizes: undefined,
          text: undefined,
          unsupported: true
        }
      ]
    )

    deviceSessions.set({ own: { device: 'name', service: 'telegram' } })
    testTelegram.answers.getMessage = ({ message_id: id }) => {
      return stickers[Number(id) / 1048576]!
    }
    testTelegram.answers.downloadFile = ({ file_id: id }) => ({
      '@type': 'file',
      id,
      'size': 4
    })
    testTelegram.files = {
      77: new Blob(['static']),
      85: new Blob(['frame']),
      86: new Blob(['frame'])
    }
    let { getMedia } = loaders.telegram
    for (let [url, type, text] of [
      ['telegram:5/7', 'image/webp', 'stat'],
      ['telegram:5/6', 'image/jpeg', 'fram'],
      ['telegram:5/5', 'image/webp', 'fram']
    ] as const) {
      let response = await getMedia!(url)!
      equal(response.headers.get('Content-Type'), type)
      equal(await response.text(), text)
    }
    for (let url of ['telegram:5/7/poster', 'telegram:5/6/poster']) {
      await rejects(getMedia!(url)!, {
        message: 'Telegram post has no such media'
      })
    }
  })

  test('loads the rest of long posts with rich formatting', async () => {
    deviceSessions.set({ own: { device: 'name', service: 'telegram' } })
    mockHistory(1, {
      0: [
        rich(2, [paragraph(plain('Cut 2'))], false),
        rich(1, [paragraph(plain('Cut 1'))], false)
      ]
    })
    testTelegram.answers.getFullRichMessage = ({ message_id: id }) => ({
      '@type': 'richMessage',
      'blocks': [
        paragraph(plain(`Full ${Number(id) / 1048576}`)),
        richPhoto(81),
        richPhoto(83)
      ],
      'is_full': true
    })
    let posts = await loadFeedPosts('{"id":"-1000000000005"}')
    deepEqual(
      posts.map(post => [post.full, post.media?.length, post.old]),
      [
        [
          '<p>Full 2</p>' +
            '<img src="telegram:5/2/0" alt="" width="800" height="800">' +
            '<img src="telegram:5/2/1" alt="" width="800" height="800">',
          2,
          undefined
        ],
        ['<p>Cut 1</p>', undefined, true]
      ]
    )
    deepEqual(
      testTelegram.requests.filter(i => i['@type'] === 'getFullRichMessage'),
      [
        {
          '@type': 'getFullRichMessage',
          'chat_id': -1000000000005,
          'message_id': 2 * 1048576
        }
      ]
    )

    testTelegram.answers.getMessage = rich(
      3,
      [paragraph(plain('Cut 3'))],
      false
    )
    testTelegram.answers.downloadFile = ({ file_id: id }) => ({
      '@type': 'file',
      id,
      'size': 5
    })
    testTelegram.files = { 84: new Blob(['photo']) }
    let { getMedia, getPostByUrl } = loaders.telegram
    equal(await (await getMedia!('telegram:5/3/1')!).text(), 'photo')
    await rejects(getMedia!('telegram:5/3/2')!, {
      message: 'Telegram post has no such media'
    })
    await rejects(getMedia!('telegram:5/3')!, {
      message: 'Telegram post has no such media'
    })
    testTelegram.answers.getMessage = rich(
      3,
      [paragraph(plain('Cut 3'))],
      false
    )
    testTelegram.answers.getSupergroup = { '@type': 'supergroup' }
    equal(
      (await getPostByUrl!(task, 'https://t.me/c/5/3')).full?.slice(0, 13),
      '<p>Full 3</p>'
    )
  })

  test('loads media files by TDLib', async () => {
    let { getMedia } = loaders.telegram
    equal(getMedia!('https://example.com/a.jpg'), undefined)
    await rejects(getMedia!('telegram:5/4')!, {
      message: 'No Telegram session on this device'
    })

    deviceSessions.set({
      other: { device: 'other', service: 'mastodon' },
      own: { device: 'name', service: 'telegram' }
    })
    mockHistory(0, {})
    let posts: Record<number, TelegramObject> = {
      3: videoPost,
      4: photoPost,
      5: previewPost,
      6: message(6)
    }
    testTelegram.answers.getMessage = ({ message_id: id }) => {
      return posts[Number(id) / 1048576] ?? fail('Not found', 404)
    }
    testTelegram.answers.downloadFile = ({ file_id: id }) => ({
      '@type': 'file',
      id,
      'size': 4
    })
    testTelegram.files = {
      12: new Blob(['photo']),
      21: new Blob(['poster']),
      22: new Blob(['video']),
      31: new Blob(['preview'])
    }

    let image = await getMedia!('telegram:5/4')!
    equal(image.headers.get('Content-Type'), 'image/jpeg')
    equal(await image.text(), 'phot')
    deepEqual(
      testTelegram.requests.filter(i => i['@type'] !== 'getChat'),
      [
        {
          '@type': 'getMessage',
          'chat_id': -1000000000005,
          'message_id': 4 * 1048576
        },
        {
          '@type': 'downloadFile',
          'file_id': 12,
          'limit': 0,
          'offset': 0,
          'priority': 16,
          'synchronous': true
        },
        { '@type': 'deleteFile', 'file_id': 12 }
      ]
    )

    let video = await getMedia!('telegram:5/3')!
    equal(video.headers.get('Content-Type'), 'video/mp4')
    equal(await video.text(), 'vide')
    equal(await (await getMedia!('telegram:5/3/poster')!).text(), 'post')
    equal(await (await getMedia!('telegram:5/5/preview')!).text(), 'prev')

    for (let url of ['telegram:5/6', 'telegram:5/4/poster']) {
      await rejects(getMedia!(url)!, {
        message: 'Telegram post has no such media'
      })
    }
    await rejects(getMedia!('telegram:5/9')!, { name: 'TelegramError' })
  })

  test('downloads file once for parallel requests', async () => {
    let { getMedia } = loaders.telegram
    deviceSessions.set({ own: { device: 'name', service: 'telegram' } })
    mockHistory(0, {})
    testTelegram.answers.getMessage = photoPost
    testTelegram.answers.downloadFile = ({ file_id: id }) => {
      testTelegram.files = { 12: new Blob(['photo']) }
      return { '@type': 'file', id, 'size': 5 }
    }
    // Like real TDLib, which can not read the deleted file
    testTelegram.answers.deleteFile = () => {
      testTelegram.files = {}
      return { '@type': 'ok' }
    }
    function countDownloads(): number {
      return testTelegram.requests.filter(i => i['@type'] === 'downloadFile')
        .length
    }

    let [page, cache] = await Promise.all([
      getMedia!('telegram:5/4')!,
      getMedia!('telegram:5/4')!
    ])
    equal(await page.text(), 'photo')
    equal(await cache.text(), 'photo')
    equal(countDownloads(), 1)

    equal(await (await getMedia!('telegram:5/4')!).text(), 'photo')
    equal(countDownloads(), 2)

    testTelegram.answers.downloadFile = fail('No file', 404)
    await rejects(getMedia!('telegram:5/4')!, { name: 'TelegramError' })
    testTelegram.answers.downloadFile = { '@type': 'file', 'id': 12, 'size': 5 }
    testTelegram.files = { 12: new Blob(['again']) }
    equal(await (await getMedia!('telegram:5/4')!).text(), 'again')
  })

  test('cancels download only when all readers stop', async () => {
    let { getMedia } = loaders.telegram
    deviceSessions.set({ own: { device: 'name', service: 'telegram' } })
    mockHistory(0, {})
    testTelegram.answers.getMessage = videoPost
    let finish: (() => void) | undefined
    testTelegram.answers.downloadFile = ({ file_id: id }) => {
      return new Promise(resolve => {
        finish = () => {
          resolve({ '@type': 'file', id, 'size': 5 })
        }
      })
    }
    testTelegram.answers.cancelDownloadFile = () => {
      finish!()
      return { '@type': 'ok' }
    }
    testTelegram.answers.deleteFile = { '@type': 'ok' }
    testTelegram.files = { 12: new Blob(['photo']), 22: new Blob(['video']) }
    function countRequests(type: string): number {
      return testTelegram.requests.filter(i => i['@type'] === type).length
    }

    let feed = new AbortController()
    let popup = new AbortController()
    let feedLoading = getMedia!('telegram:5/3', feed.signal)!
    let popupLoading = getMedia!('telegram:5/3', popup.signal)!
    await setTimeout(10)
    equal(countRequests('downloadFile'), 1)

    feed.abort()
    await rejects(feedLoading, { name: 'AbortError' })
    equal(countRequests('cancelDownloadFile'), 0)

    popup.abort()
    await rejects(popupLoading, { name: 'AbortError' })
    deepEqual(
      testTelegram.requests.filter(i => i['@type'] === 'cancelDownloadFile'),
      [
        {
          '@type': 'cancelDownloadFile',
          'file_id': 22,
          'only_if_pending': false
        }
      ]
    )
    await setTimeout(10)
    equal(countRequests('deleteFile'), 1)

    let again = getMedia!('telegram:5/3')!
    await setTimeout(10)
    finish!()
    equal(await (await again).text(), 'video')
    equal(countRequests('downloadFile'), 2)

    let stopped = new AbortController()
    stopped.abort()
    await rejects(getMedia!('telegram:5/3', stopped.signal)!, {
      name: 'AbortError'
    })
    equal(countRequests('downloadFile'), 2)
    equal(countRequests('getMessage'), 3)

    // A started photo is finished for the user, who scrolls back
    testTelegram.answers.getMessage = photoPost
    let scrolled = new AbortController()
    let passed = getMedia!('telegram:5/4', scrolled.signal)!
    await setTimeout(10)
    scrolled.abort()
    finish!()
    equal(await (await passed).text(), 'photo')
    equal(countRequests('cancelDownloadFile'), 1)
  })

  test('limits bytes of files, which are downloaded at once', async () => {
    let { getMedia } = loaders.telegram
    deviceSessions.set({ own: { device: 'name', service: 'telegram' } })
    mockHistory(0, {})
    testTelegram.answers.getMessage = ({ message_id: id }) => {
      let post = Number(id) / 1048576
      return message(post, {
        content: {
          '@type': 'messagePhoto',
          'photo': {
            '@type': 'photo',
            'sizes': [
              {
                height: 500,
                photo: file(post, post === 1 ? 50_000_000 : 900_000),
                width: 800
              }
            ]
          }
        }
      })
    }
    let finish = new Map<number, () => void>()
    testTelegram.answers.downloadFile = ({ file_id: id, synchronous }) => {
      let downloaded = { '@type': 'file', id, 'size': 4 }
      if (!synchronous) return downloaded
      return new Promise(resolve => {
        finish.set(Number(id), () => {
          resolve(downloaded)
        })
      })
    }
    testTelegram.answers.deleteFile = { '@type': 'ok' }
    testTelegram.files = Object.fromEntries(
      [1, 2, 3, 4, 5, 6, 7, 8].map(id => [id, new Blob(['file'])])
    )
    function getStarted(): unknown[] {
      return testTelegram.requests
        .filter(i => i['@type'] === 'downloadFile' && i.synchronous)
        .map(i => i.file_id)
    }
    function load(
      post: number,
      urgency: 'later' | 'now' | 'soon',
      signal?: AbortSignal
    ): Promise<Response> {
      return getMedia!(`telegram:5/${post}`, signal, undefined, urgency)!
    }

    // A big file is asked by parts, so it does not hold all other files
    let cache = [1, 2, 3, 4, 5].map(post => load(post, 'later'))
    await setTimeout(10)
    deepEqual(getStarted(), [1, 2, 3])

    let feed = load(6, 'now')
    let below = load(7, 'soon')
    await setTimeout(10)
    deepEqual(getStarted(), [1, 2, 3, 6, 7])

    finish.get(2)!()
    await setTimeout(10)
    deepEqual(getStarted(), [1, 2, 3, 6, 7])
    finish.get(6)!()
    finish.get(7)!()
    await setTimeout(10)
    deepEqual(getStarted(), [1, 2, 3, 6, 7, 4])

    let shown = load(5, 'now')
    await setTimeout(10)
    deepEqual(getStarted(), [1, 2, 3, 6, 7, 4, 5])

    let page = new AbortController()
    let left = load(8, 'later', page.signal)
    await setTimeout(10)
    page.abort()
    await rejects(left, { name: 'AbortError' })
    for (let id of [1, 3, 4, 5]) finish.get(id)!()
    for (let reader of [...cache, feed, below, shown]) {
      equal(await (await reader).text(), 'file')
    }
    deepEqual(getStarted(), [1, 2, 3, 6, 7, 4, 5])
  })

  test('does not send waiting requests of the closed page', async () => {
    let { getMedia } = loaders.telegram
    deviceSessions.set({ own: { device: 'name', service: 'telegram' } })
    mockHistory(0, {})
    testTelegram.answers.getMessage = photoPost
    testTelegram.answers.downloadFile = { '@type': 'file', 'id': 12, 'size': 5 }
    testTelegram.answers.deleteFile = { '@type': 'ok' }
    testTelegram.files = { 12: new Blob(['photo']) }
    let free: (() => void)[] = []
    testTelegram.answers.getMe = () => {
      return new Promise(resolve => {
        free.push(() => {
          resolve(USER)
        })
      })
    }
    let busy = [1, 2, 3].map(() => sendToTelegram('name', { '@type': 'getMe' }))

    let page = new AbortController()
    let closed = getMedia!('telegram:5/4', page.signal)!
    let opened = getMedia!('telegram:5/4')!
    await setTimeout(10)
    page.abort()
    for (let answer of free) answer()
    await rejects(closed, { name: 'AbortError' })
    await Promise.all(busy)
    equal(await (await opened).text(), 'photo')
    deepEqual(getRequestTypes(), [
      'getMe',
      'getMe',
      'getMe',
      'getChat',
      'getMessage',
      'downloadFile',
      'deleteFile'
    ])
  })

  function mockVideo(): void {
    deviceSessions.set({ own: { device: 'name', service: 'telegram' } })
    mockHistory(0, {})
    testTelegram.answers.getMessage = videoPost
    testTelegram.answers.downloadFile = ({ file_id: id }) => ({
      '@type': 'file',
      id,
      'size': 5000
    })
    testTelegram.answers.cancelDownloadFile = { '@type': 'ok' }
    testTelegram.answers.deleteFile = { '@type': 'ok' }
    testTelegram.files = { 22: new Blob(['0123456789'.repeat(500)]) }
  }

  function getMediaRequests(): TelegramObject[] {
    return testTelegram.requests.filter(i => i['@type'] !== 'getChat')
  }

  test('gives only asked parts of the video to its player', async () => {
    let { getMedia } = loaders.telegram
    mockVideo()
    let feed = new AbortController()
    let popup = new AbortController()

    let start = await getMedia!('telegram:5/3', feed.signal, {
      end: 9,
      start: 0
    })!
    equal(start.status, 206)
    equal(start.headers.get('Content-Range'), 'bytes 0-9/5000')
    equal(start.headers.get('Content-Type'), 'video/mp4')
    equal(await start.text(), '0123456789')

    let end = await getMedia!('telegram:5/3', popup.signal, {
      end: 9999,
      start: 4995
    })!
    equal(end.headers.get('Content-Range'), 'bytes 4995-4999/5000')
    equal(await end.text(), '56789')
    deepEqual(getMediaRequests(), [
      {
        '@type': 'getMessage',
        'chat_id': -1000000000005,
        'message_id': 3 * 1048576
      },
      {
        '@type': 'downloadFile',
        'file_id': 22,
        'limit': 10,
        'offset': 0,
        'priority': 32,
        'synchronous': true
      },
      {
        '@type': 'downloadFile',
        'file_id': 22,
        'limit': 5,
        'offset': 4995,
        'priority': 32,
        'synchronous': true
      }
    ])

    let outside = await getMedia!('telegram:5/3', feed.signal, {
      end: 5010,
      start: 5000
    })!
    equal(outside.status, 416)
    equal(outside.headers.get('Content-Range'), 'bytes */5000')

    testTelegram.requests = []
    feed.abort()
    await setTimeout(10)
    deepEqual(testTelegram.requests, [])

    popup.abort()
    await waitUntil(() => testTelegram.requests.length === 2)
    deepEqual(testTelegram.requests, [
      {
        '@type': 'cancelDownloadFile',
        'file_id': 22,
        'only_if_pending': false
      },
      { '@type': 'deleteFile', 'file_id': 22 }
    ])
    await rejects(
      getMedia!('telegram:5/3', popup.signal, { end: 9, start: 0 })!,
      { name: 'AbortError' }
    )
  })

  test('downloads parts of the video one by one', async () => {
    let { getMedia } = loaders.telegram
    mockVideo()
    let finish: ((answer: TelegramObject) => void)[] = []
    testTelegram.answers.downloadFile = () => {
      return new Promise(resolve => {
        finish.push(resolve)
      })
    }
    let done = { '@type': 'file', 'id': 22, 'size': 5000 }
    let player = new AbortController()

    let broken = getMedia!('telegram:5/3', player.signal, { end: 9, start: 0 })!
    let next = getMedia!('telegram:5/3', player.signal, { end: 19, start: 10 })!
    let unwanted = getMedia!('telegram:5/3', player.signal, {
      end: 29,
      start: 20
    })!
    await setTimeout(10)
    equal(finish.length, 1)

    finish[0]!(fail('Flood', 420))
    await rejects(broken, { name: 'TelegramError' })
    await waitUntil(() => finish.length === 2)

    player.abort()
    finish[1]!(done)
    await Promise.all([
      next.then(async part => {
        equal(await part.text(), '0123456789')
      }),
      rejects(unwanted, { name: 'AbortError' })
    ])
    equal(finish.length, 2)
  })

  test('looks for the video file again after TDLib restart', async () => {
    let { getMedia } = loaders.telegram
    mockVideo()
    let player = new AbortController()
    let part = { end: 9, start: 0 }
    await getMedia!('telegram:5/3', player.signal, part)
    await getMedia!('telegram:5/3', player.signal, part)
    equal(getMediaRequests().filter(i => i['@type'] === 'getMessage').length, 1)

    sendTelegramUpdate(state('Closed'), 'name')
    await getMedia!('telegram:5/3', undefined, part)
    equal(getMediaRequests().filter(i => i['@type'] === 'getMessage').length, 2)

    // File ID belongs to another file after the restart
    testTelegram.requests = []
    player.abort()
    await setTimeout(10)
    deepEqual(testTelegram.requests, [])
  })

  test('keeps in TDLib only the video, which is played now', async () => {
    let { getMedia } = loaders.telegram
    mockVideo()
    let posts: Record<number, TelegramObject> = {
      3: videoPost,
      7: message(7, {
        content: {
          '@type': 'messageVideo',
          'video': {
            '@type': 'video',
            'mime_type': 'video/mp4',
            'video': file(72, 5000)
          }
        }
      }),
      8: message(8, {
        content: {
          '@type': 'messageVideo',
          'video': {
            '@type': 'video',
            'mime_type': 'video/mp4',
            'video': file(82, 5000)
          }
        }
      })
    }
    testTelegram.answers.getMessage = ({ message_id: id }) => {
      return posts[Number(id) / 1048576]!
    }
    let finish: (() => void) | undefined
    testTelegram.answers.downloadFile = ({ file_id: id }) => {
      let done = { '@type': 'file', id, 'size': 5000 }
      if (id !== 72) return done
      return new Promise(resolve => {
        finish = () => {
          resolve(done)
        }
      })
    }
    testTelegram.files = {
      22: new Blob(['first']),
      72: new Blob(['second']),
      82: new Blob(['third'])
    }
    function getFreed(): unknown[] {
      return testTelegram.requests
        .filter(i => i['@type'] === 'deleteFile')
        .map(i => i.file_id)
    }
    let part = { end: 4, start: 0 }
    let first = new AbortController()

    await getMedia!('telegram:5/3', first.signal, part)
    let second = getMedia!('telegram:5/7', undefined, part)!
    await waitUntil(() => getFreed().length === 1)
    deepEqual(getFreed(), [22])

    equal(
      await (await getMedia!('telegram:5/8', undefined, part)!).text(),
      'third'
    )
    await setTimeout(10)
    deepEqual(getFreed(), [22])

    finish!()
    equal(await (await second).text(), 'secon')
    await getMedia!('telegram:5/3', first.signal, part)
    await waitUntil(() => getFreed().length === 3)
    deepEqual(getFreed(), [22, 72, 82])

    first.abort()
    await waitUntil(() => getFreed().length === 4)
    deepEqual(getFreed(), [22, 72, 82, 22])
  })

  test('stops media cache download for the video player', async t => {
    let { getMedia } = loaders.telegram
    mockVideo()
    cacheVideos.set('always')
    t.after(() => {
      cacheVideos.set('never')
    })
    let cancel: (() => void) | undefined
    testTelegram.answers.downloadFile = ({ file_id: id, limit }) => {
      if (limit === 0 && !cancel) {
        return new Promise(resolve => {
          cancel = () => {
            resolve(fail('Canceled by another downloadFile request', 200))
          }
        })
      }
      cancel?.()
      return { '@type': 'file', id, 'size': 5000 }
    }
    await addPost(
      testPost({
        media: [{ type: 'video', url: 'telegram:5/3' }],
        reading: 'slow'
      })
    )

    let caching = syncMediaCache()
    await waitUntil(() => !!cancel)
    let player = new AbortController()
    let part = await getMedia!('telegram:5/3', player.signal, {
      end: 9,
      start: 0
    })!
    equal(await part.text(), '0123456789')
    await caching
    deepEqual(mediaErrors.get(), [])
    equal(await isMediaCached('telegram:5/3'), false)
    equal(getMediaRequests().filter(i => i['@type'] === 'deleteFile').length, 0)

    testTelegram.requests = []
    await syncMediaCache()
    deepEqual(mediaErrors.get(), [])
    equal(await isMediaCached('telegram:5/3'), false)
    deepEqual(
      getMediaRequests().map(i => i['@type']),
      ['getMessage']
    )

    player.abort()
    await waitUntil(() => {
      return testTelegram.requests.some(i => i['@type'] === 'deleteFile')
    })
    await syncMediaCache()
    equal(await isMediaCached('telegram:5/3'), true)
  })

  test('gives media to the cache and to the page', async t => {
    deviceSessions.set({ own: { device: 'name', service: 'telegram' } })
    mockHistory(0, {})
    testTelegram.answers.getMessage = photoPost
    testTelegram.answers.downloadFile = { '@type': 'file', 'id': 12, 'size': 5 }
    testTelegram.files = { 12: new Blob(['photo']) }

    equal(loadMediaBlob('https://example.com/a.jpg'), undefined)
    await rejects(loadMediaBlob('unknown:1')!, {
      message: 'No loader for unknown:1'
    })
    equal(await (await loadMediaBlob('telegram:5/4')!).text(), 'photo')
    equal(await isMediaCached('telegram:5/4'), false)

    await cacheMediaOnRequest('telegram:5/4')
    equal(await isMediaCached('telegram:5/4'), true)
    testTelegram.answers.getMessage = fail('Not found', 404)
    equal(await (await loadMediaBlob('telegram:5/4')!).text(), 'photo')

    testTelegram.answers.getMessage = previewPost
    testTelegram.files = { 31: new Blob(['preview']) }
    await addPost(
      testPost({
        preview: { image: 'telegram:5/5/preview', url: 'https://example.com/' },
        reading: 'slow'
      })
    )
    deviceSessions.set({})
    await syncMediaCache()
    equal(await isMediaCached('telegram:5/5/preview'), false)
    deepEqual(mediaErrors.get(), [])
    deviceSessions.set({ own: { device: 'name', service: 'telegram' } })
    await syncMediaCache()
    equal(await isMediaCached('telegram:5/5/preview'), true)
    equal(
      testTelegram.requests.findLast(i => i['@type'] === 'downloadFile')!
        .priority,
      1
    )

    // Avatars are on the screen all the time, so they are kept after
    // the first loading with any cache settings
    cacheImages.set('never')
    t.after(() => {
      cacheImages.set('always')
    })
    testTelegram.answers.getMessage = photoPost
    testTelegram.files = { 12: new Blob(['photo']) }
    await addAccount(
      testAccount({
        avatar: 'telegram:5/4',
        credentials: null,
        service: 'telegram'
      })
    )
    equal(await (await loadMediaBlob('telegram:5/4', true)!).text(), 'photo')
    equal(await (await loadMediaBlob('telegram:5/3', true)!).text(), 'photo')
    await syncMediaCache()
    equal(await isMediaCached('telegram:5/4'), true)
    equal(await isMediaCached('telegram:5/3'), false)
    equal(await isMediaCached('telegram:5/5/preview'), false)
  })

  test('saves the file of the page for the media cache', async t => {
    let cache = getTestEnvironment().mediaCache
    let full = new Error('No space')
    let space = false
    setupEnvironment({
      ...getTestEnvironment(),
      mediaCache: {
        ...cache,
        put(url, response) {
          return space ? cache.put(url, response) : Promise.reject(full)
        }
      },
      telegramCreator: testTelegramCreator
    })
    t.after(() => {
      cacheMediaReading.set('all')
      cacheImages.set('always')
    })
    mockHistory(0, {})
    testTelegram.answers.getMessage = photoPost
    testTelegram.answers.downloadFile = { '@type': 'file', 'id': 12, 'size': 5 }
    testTelegram.files = { 12: new Blob(['photo']) }
    let id = await addPost(
      testPost({
        media: [{ type: 'image', url: 'telegram:5/4' }],
        mediaSizes: [{ approximate: true, height: 1, width: 2 }]
      })
    )
    await addPost(
      testPost({ author: { avatar: 'telegram:5/4', title: 'Author' } })
    )
    await addPost(testPost({ media: [{ type: 'video', url: 'telegram:5/4' }] }))
    await syncMediaCache()
    deviceSessions.set({ own: { device: 'name', service: 'telegram' } })

    async function showOnPage(): Promise<void> {
      equal(await (await loadMediaBlob('telegram:5/4')!).text(), 'photo')
      await setTimeout(10)
    }

    await expectWarning(showOnPage, [full])
    space = true

    cacheMediaReading.set('slow')
    await showOnPage()
    cacheMediaReading.set('all')
    cacheImages.set('never')
    await showOnPage()
    equal(await isMediaCached('telegram:5/4'), false)

    cacheImages.set('always')
    await showOnPage()
    equal(await isMediaCached('telegram:5/4'), true)
    deepEqual((await loadPost(id))?.mediaSizes, [
      { bytes: 5, height: 1, width: 2 }
    ])
    testTelegram.requests = []
    await syncMediaCache()
    deepEqual(testTelegram.requests, [])
  })

  test('gives ad of the channel as a dynamic post', async () => {
    deviceSessions.set({ own: { device: 'name', service: 'telegram' } })
    mockHistory(0, {})
    let auth = {
      account: testAccount({ credentials: null, service: 'telegram' }),
      device: 'name',
      expire: () => Promise.resolve(),
      reload: () => Promise.resolve(undefined),
      save: () => Promise.resolve()
    }
    function loadDynamic(): Promise<object[]> {
      return loaders.telegram.getDynamicPosts!(
        'https://t.me/a',
        '{"id":"-1000000000005"}',
        auth
      )
    }
    function mockAds(...messages: object[]): void {
      testTelegram.answers.getChatSponsoredMessages = {
        '@type': 'sponsoredMessages',
        messages
      }
    }

    mockAds(
      {
        '@type': 'sponsoredMessage',
        'additional_info': '18+',
        'button_text': 'Open <site>',
        'content': photoPost.content,
        'is_recommended': false,
        'message_id': 9,
        'sponsor': {
          '@type': 'advertisementSponsor',
          'info': 'Shop Inc.',
          'url': 'https://shop.example.com/?a=1&b=2'
        },
        'title': 'Shop'
      },
      { '@type': 'sponsoredMessage', 'message_id': 10 }
    )
    deepEqual(await loadDynamic(), [
      {
        dynamic: 'sponsored',
        full:
          '<p>Caption</p>' +
          '<p><a href="https://shop.example.com/?a=1&amp;b=2">' +
          'Open &lt;site&gt;</a></p><p>Shop Inc.</p><p>18+</p>',
        media: [
          {
            placeholder: 'data:image/jpeg;base64,AAAA',
            type: 'image',
            url: 'telegram:5/sponsored/9'
          }
        ],
        mediaSizes: [{ bytes: 1000, height: 500, width: 800 }],
        originId: '9',
        title: 'Shop',
        url: 'https://shop.example.com/?a=1&b=2'
      }
    ])

    testTelegram.answers.downloadFile = ({ file_id: id }) => ({
      '@type': 'file',
      id,
      'size': 5
    })
    testTelegram.files = { 12: new Blob(['photo']) }
    testTelegram.requests = []
    let image = await loaders.telegram.getMedia!('telegram:5/sponsored/9')!
    equal(await image.text(), 'photo')
    equal(
      testTelegram.requests.some(i => i['@type'] === 'getMessage'),
      false
    )

    mockAds({
      '@type': 'sponsoredMessage',
      'additional_info': '',
      'button_text': 'View channel',
      'content': {
        '@type': 'messageText',
        'text': { '@type': 'formattedText', 'text': 'Join us' }
      },
      'is_recommended': true,
      'message_id': 10,
      'sponsor': {
        '@type': 'advertisementSponsor',
        'info': '',
        'url': 'https://t.me/other'
      },
      'title': 'Channel'
    })
    deepEqual(await loadDynamic(), [
      {
        dynamic: 'recommended',
        full: '<p>Join us</p><p><a href="https://t.me/other">View channel</a></p>',
        originId: '10',
        title: 'Channel',
        url: 'https://t.me/other'
      }
    ])

    mockAds({ '@type': 'sponsoredMessage', 'message_id': 11 })
    deepEqual(await loadDynamic(), [])
    mockAds()
    deepEqual(await loadDynamic(), [])
    testTelegram.answers.getChatSponsoredMessages = {
      '@type': 'sponsoredMessages'
    }
    deepEqual(await loadDynamic(), [])
    deepEqual(await loaders.telegram.getDynamicPosts!('https://t.me/c/5'), [])
  })

  test('skips service messages and marks unknown and paid content', async () => {
    mockHistory(9, {
      0: [message(9, { content: null }), message(8)],
      8: [
        message(7, { content: { '@type': 'messageVideoNote' } }),
        message(6, { content: { '@type': 'messagePinMessage' } })
      ],
      6: [
        message(5, {
          content: {
            '@type': 'messagePaidMedia',
            'caption': { '@type': 'formattedText', 'entities': [], 'text': '' },
            'media': [{ '@type': 'paidMediaPreview', 'height': 0, 'width': 0 }],
            'star_count': 50
          }
        })
      ]
    })
    deepEqual(await loadFeedPosts(), [
      {
        old: true,
        originId: '9',
        publishedAt: 1009,
        unsupported: true,
        url: 'https://t.me/news/9'
      },
      {
        full: '<p>Post 8</p>',
        old: true,
        originId: '8',
        publishedAt: 1008,
        url: 'https://t.me/news/8'
      },
      {
        old: true,
        originId: '7',
        publishedAt: 1007,
        unsupported: true,
        url: 'https://t.me/news/7'
      },
      {
        old: true,
        originId: '5',
        paid: true,
        publishedAt: 1005,
        url: 'https://t.me/news/5'
      }
    ])
  })

  test('loads the chat list, when TDLib does not know the channel', async () => {
    mockHistory(1, { 0: [message(2)] })
    let known = false
    testTelegram.answers.getChat = ({ chat_id: id }) => {
      return known ? news(id, 1) : fail('Chat not found')
    }
    testTelegram.answers.loadChats = () => {
      known = true
      return fail('Not Found', 404)
    }
    deepEqual(
      (await loadFeedPosts()).map(post => post.originId),
      ['2']
    )

    testTelegram.answers.getChat = fail('Chat not found')
    deepEqual(await loadFeedPosts(), [])

    // TDLib forgets the chat list on restart, but we remember the lost chat
    sendTelegramUpdate(state('Closed'))
    testTelegram.requests = []
    deepEqual(await loadFeedPosts(), [])
    equal(getRequestTypes().includes('loadChats'), false)

    sendTelegramUpdate({ '@type': 'updateNewChat', 'chat': news(-1001, 1) })
    deepEqual(await loadFeedPosts(), [])
    equal(getRequestTypes().includes('loadChats'), true)

    testTelegram.answers.getChat = () => {
      throw new Error('TDLib is broken')
    }
    await rejects(loadFeedPosts(), { message: 'TDLib is broken' })
  })

  test('refreshes channels of the account with a session here', async () => {
    let signedIn = await addAccount(
      testAccount({
        credentials: null,
        followsSyncedAt: Math.round(Date.now() / 1000),
        service: 'telegram'
      })
    )
    let other = await addAccount(
      testAccount({ credentials: null, handle: '@other', service: 'telegram' })
    )
    deviceSessions.set({ [signedIn]: { device: 'name', service: 'telegram' } })
    let channel = await addFeed(
      testFeed({
        accountId: signedIn,
        loader: 'telegram',
        loaderData: '{"id":"-1001"}',
        url: 'https://t.me/news'
      })
    )
    let second = await addFeed(
      testFeed({
        accountId: signedIn,
        loader: 'telegram',
        loaderData: '{"id":"-1003"}',
        url: 'https://t.me/second'
      })
    )
    await addFeed(
      testFeed({
        accountId: other,
        loader: 'telegram',
        loaderData: '{"id":"-1002"}',
        url: 'https://t.me/other'
      })
    )
    mockHistory(1, { 0: [message(2)], 2: [message(1)] })
    mockChatList([news(-1001, 1), news(-1003, 1)])
    await refreshPosts()
    deepEqual(refreshErrors.get(), [
      {
        account: { handle: '@other', id: other, service: 'telegram' },
        error: new UserFacingError(accountsMessages.get().notSignedInHere)
      }
    ])
    equal(refreshStatus.get(), 'error')
    deepEqual(
      new Set((await loadPosts()).map(post => `${post.feedId} ${post.url}`)),
      new Set([
        `${channel} https://t.me/news/2`,
        `${second} https://t.me/second/2`
      ])
    )
    equal((await loadFeed(channel))!.lastOriginId, '2')
    // Every channel is a separate request, so the progress counts it,
    // and the account itself has no timeline to load. Account without
    // a session here is counted as failed.
    equal(refreshStatistics.get().totalFeeds, 3)
    equal(refreshStatistics.get().processedFeeds, 3)
    equal(refreshStatistics.get().errorFeeds, 1)
    equal(!!(await loadFeed(channel))!.protected, false)

    // Author forbids or allows copying for all posts of the channel at once
    for (let [id, post] of [
      [-1001, message(3, { can_be_saved: false })],
      [-1003, message(3)]
    ] as const) {
      sendTelegramUpdate({
        '@type': 'updateChatLastMessage',
        'chat_id': id,
        'last_message': post,
        'positions': []
      })
    }
    await refreshPosts()
    equal(refreshErrors.get().length, 1)
    equal((await loadFeed(channel))!.protected, true)
    equal(!!(await loadFeed(second))!.protected, false)
    equal((await loadPosts()).filter(i => i.originId === '3').length, 2)

    sendTelegramUpdate({
      '@type': 'updateChatLastMessage',
      'chat_id': -1001,
      'last_message': message(4),
      'positions': []
    })
    await refreshPosts()
    equal((await loadFeed(channel))!.protected, false)
  })

  test('loads the post, which Telegram pushed', async t => {
    let accountId = await addAccount(
      testAccount({
        credentials: null,
        followsSyncedAt: Math.round(Date.now() / 1000),
        service: 'telegram'
      })
    )
    deviceSessions.set({ [accountId]: { device: 'name', service: 'telegram' } })
    await addFeed(
      testFeed({
        accountId,
        loader: 'telegram',
        loaderData: '{"id":"-1001"}',
        url: 'https://t.me/news'
      })
    )
    mockHistory(1, { 0: [message(2)], 2: [message(1)] })
    mockChatList([news(-1001, 1)])
    await refreshPosts()
    equal((await loadPosts()).length, 1)
    let refreshed = lastRefresh.get()
    t.after(() => {
      autoRefresh.set('never')
    })
    autoRefresh.set('always')

    function push(id: number, post: number): void {
      sendTelegramUpdate({
        '@type': 'updateChatLastMessage',
        'chat_id': id,
        'last_message': message(post),
        'positions': []
      })
      sendTelegramUpdate({
        '@type': 'updateNewMessage',
        'message': { ...message(post), chat_id: id }
      })
    }

    // Chats of people and unknown channels are not tracked
    push(77, 9)
    push(-1001, 3)
    await waitUntil(async () => (await loadPosts()).length === 2)
    deepEqual(
      new Set((await loadPosts()).map(post => post.url)),
      new Set(['https://t.me/news/2', 'https://t.me/news/3'])
    )
    equal(lastRefresh.get(), refreshed)

    // Another device with the same account loads posts right now
    await getClient().log.add(refreshLocked({ nodeId: 'other' }))
    equal(refreshStatus.get(), 'other')
    push(-1001, 4)
    await setTimeout(1200)
    equal((await loadPosts()).length, 2)
    // It could ask the feed before the post, so we check after it
    await getClient().log.add(refreshUnlocked({}))
    await waitUntil(async () => (await loadPosts()).length === 3)

    testTelegram.answers.getChatHistory = fail('Broken', 500)
    await expectWarning(async () => {
      push(-1001, 5)
      await setTimeout(1200)
    }, [new TelegramError(500, 'Broken')])

    autoRefresh.set('never')
    testTelegram.answers.getChatHistory = {
      '@type': 'messages',
      'messages': []
    }
    push(-1001, 6)
    await setTimeout(1200)
    equal((await loadPosts()).length, 3)
  })

  test('asks Telegram only about channels with news', async () => {
    let now = Math.round(Date.now() / 1000)
    let accountId = await addAccount(
      testAccount({
        credentials: null,
        followsSyncedAt: now,
        service: 'telegram'
      })
    )
    deviceSessions.set({ [accountId]: { device: 'name', service: 'telegram' } })
    let ids: Record<string, string> = {}
    for (let id of ['-1001', '-1002', '-1003', '-1004']) {
      ids[id] = await addFeed(
        testFeed({
          accountId,
          lastOriginId: '5',
          lastPublishedAt: 1005,
          loader: 'telegram',
          loaderData: JSON.stringify({ id }),
          // Refresh deletes old Fun posts
          reading: 'slow',
          refreshedAt: now - 60,
          url: `https://t.me/c/${id.slice(4)}`
        })
      )
    }
    for (let i = 1; i <= 5; i++) {
      await addPost(
        testPost({
          feedId: ids['-1002']!,
          originId: String(i),
          publishedAt: 1000 + i,
          reading: 'slow',
          url: `https://t.me/c/2/${i}`
        })
      )
    }
    async function refresh(): Promise<string[]> {
      testTelegram.requests = []
      await refreshPosts()
      deepEqual(refreshErrors.get(), [])
      return (await loadPosts())
        .map(post => post.url!.replace('https://t.me/c/', ''))
        .toSorted((a, b) => a.localeCompare(b))
    }

    testTelegram.answers.getChatHistory = ({ from_message_id: from }) => ({
      '@type': 'messages',
      'messages': [1, 2, 3].map(i => message(Number(from) / 1048576 - i))
    })
    mockChatList(
      [
        // Ad and pinned chat are on the top of the list in any date
        news(-1009, 0, {
          positions: [position(now + 1000, { source: {} })]
        }),
        news(-1004, 5, {
          last_message: message(5),
          positions: [position(2 ** 31, { is_pinned: true })]
        }),
        {
          '@type': 'chat',
          'id': 7,
          'last_message': message(9),
          'positions': [position(now - 10)],
          'type': { '@type': 'chatTypePrivate', 'user_id': 7 }
        },
        news(-1001, 4, {
          last_message: message(7),
          positions: [
            { list: { '@type': 'chatListArchive' }, order: '1' },
            position(now - 30)
          ]
        })
      ],
      [
        // The first posts were read in Telegram’s app
        news(-1002, 3, {
          last_message: message(5),
          positions: [position(now - 4000)]
        })
      ],
      [news(-1003, 5, { last_message: message(8), positions: [] })]
    )
    deepEqual(await refresh(), ['1/6', '1/7', '2/4', '2/5'])
    deepEqual(getRequestTypes(), ['loadChats', 'loadChats', 'getChatHistory'])
    deepEqual(testTelegram.requests.at(-1), {
      '@type': 'getChatHistory',
      'chat_id': -1001,
      'from_message_id': 7 * 1048576,
      'limit': 100,
      'offset': 0,
      'only_local': false
    })

    // Private chats are not kept, but chat without the last message is known
    sendTelegramUpdate({
      '@type': 'updateChatLastMessage',
      'chat_id': 7,
      'last_message': message(10),
      'positions': [position(now)]
    })
    sendTelegramUpdate({
      '@type': 'updateChatLastMessage',
      'chat_id': -1004,
      'positions': [position(2 ** 31, { is_pinned: true })]
    })
    deepEqual(await refresh(), ['1/6', '1/7', '2/4', '2/5'])
    deepEqual(getRequestTypes(), [])

    sendTelegramUpdate({
      '@type': 'updateChatLastMessage',
      'chat_id': -1002,
      'last_message': message(7),
      'positions': [position(now)]
    })
    sendTelegramUpdate({
      '@type': 'updateChatReadInbox',
      'chat_id': -1002,
      'last_read_inbox_message_id': 6 * 1048576
    })
    deepEqual(await refresh(), ['1/6', '1/7', '2/7'])
    deepEqual(getRequestTypes(), ['getChatHistory'])

    // TDLib forgets chats on restart
    sendTelegramUpdate(state('Closed'))
    mockChatList(
      [
        news(-1003, 5, {
          last_message: message(6),
          positions: [position(now - 10)]
        })
      ],
      [
        {
          '@type': 'chat',
          'id': 8,
          'positions': [position(now - 90_000)],
          'type': { '@type': 'chatTypeBasicGroup' }
        }
      ],
      [news(-1004, 5, { last_message: message(9) })]
    )
    sendTelegramUpdate({
      '@type': 'updateChatPosition',
      'chat_id': 8,
      'position': position(now - 5)
    })
    sendTelegramUpdate({ '@type': 'updateChatPosition', 'chat_id': 8 })
    deepEqual(await refresh(), ['1/6', '1/7', '2/7', '3/6'])
    deepEqual(getRequestTypes(), ['loadChats', 'loadChats', 'getChatHistory'])
  })

  test('finds followed channels in the loaded part of the chat list', async () => {
    let now = Math.round(Date.now() / 1000)
    let auth = {
      account: testAccount({ credentials: null, service: 'telegram' }),
      device: 'name',
      expire: () => Promise.resolve(),
      reload: () => Promise.resolve(undefined),
      save: () => Promise.resolve()
    }
    let feeds = [{ loaderData: '{"id":"-1001"}' }, { loaderData: null }]
    function find(): Promise<unknown[]> {
      testTelegram.requests = []
      return account.getRecentFollows!(auth, now - 60, feeds).then(follows => {
        return follows.map(author => author.url)
      })
    }
    testTelegram.answers.getSupergroup = ({ supergroup_id: id }) => ({
      '@type': 'supergroup',
      'usernames': {
        '@type': 'usernames',
        'active_usernames': [`channel${String(1e12 + Number(id))}`]
      }
    })
    mockChatList(
      [
        news(-1001, 1, { positions: [position(now - 10)] }),
        news(-1002, 1, { positions: [position(now - 20)] }),
        news(-1003, 1, { positions: [position(2 ** 31, { is_pinned: true })] }),
        // Ad
        news(-1004, 1, { positions: [position(now + 1000, { source: {} })] }),
        news(-1005, 1, {
          positions: [
            position(now - 30, { list: { '@type': 'chatListArchive' } })
          ]
        }),
        // Source of a forwarded post
        news(-1006, 1, { positions: [] }),
        news(-1007, 1, { positions: [position(now - 40)] }),
        {
          '@type': 'chat',
          'id': 7,
          'positions': [position(now - 5000)],
          'type': { '@type': 'chatTypePrivate', 'user_id': 7 }
        }
      ],
      [news(-1008, 1, { positions: [position(now - 90_000)] })]
    )
    deepEqual(await find(), [
      'https://t.me/channel1002',
      'https://t.me/channel1003',
      'https://t.me/channel1007'
    ])
    deepEqual(getRequestTypes(), [
      'loadChats',
      'getSupergroup',
      'getSupergroup',
      'getSupergroup'
    ])

    sendTelegramUpdate({
      '@type': 'updateChatPosition',
      'chat_id': -1007,
      'position': position(0)
    })
    sendTelegramUpdate({
      '@type': 'updateChatLastMessage',
      'chat_id': -1006,
      'last_message': message(5),
      'positions': [position(now)]
    })
    deepEqual(await find(), [
      'https://t.me/channel1002',
      'https://t.me/channel1003',
      'https://t.me/channel1006'
    ])

    // TDLib forgets chats on restart
    sendTelegramUpdate(state('Closed'))
    deepEqual(await find(), ['https://t.me/channel1008'])
  })

  test('adds the feed of a new channel on refresh', async () => {
    let now = Math.round(Date.now() / 1000)
    let accountId = await addAccount(
      testAccount({
        credentials: null,
        followsSyncedAt: now,
        service: 'telegram'
      })
    )
    deviceSessions.set({ [accountId]: { device: 'name', service: 'telegram' } })
    mockHistory(1, { 0: [message(2)], 2: [message(1)] })
    testTelegram.answers.getSupergroup = {
      '@type': 'supergroup',
      'usernames': { '@type': 'usernames', 'active_usernames': ['news'] }
    }
    mockChatList([news(-1001, 1, { positions: [position(now - 10)] })])
    await refreshPosts()
    deepEqual(refreshErrors.get(), [])
    deepEqual(
      (await loadFeeds()).map(feed => [feed.accountId, feed.title, feed.url]),
      [[accountId, 'News', 'https://t.me/news']]
    )
    deepEqual(
      (await loadPosts()).map(post => post.url),
      ['https://t.me/news/2']
    )
  })

  test('limits parallel requests and waits for a short block', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] })
    testTelegram.answers.getMe = USER
    testTelegram.answers.downloadFile = { '@type': 'file' }
    let sending = [1, 2, 3, 4, 5].map(() => {
      return sendToTelegram('name', { '@type': 'getMe' })
    })
    void sendToTelegram('name', { '@type': 'downloadFile' })
    deepEqual(getRequestTypes(), ['getMe', 'getMe', 'getMe', 'downloadFile'])
    await Promise.all(sending)
    equal(getRequestTypes().filter(i => i === 'getMe').length, 5)

    testTelegram.requests = []
    testTelegram.answers.getMe = () => {
      return testTelegram.requests.length === 1
        ? fail('Too Many Requests: retry after 3', 429)
        : USER
    }
    let retried = sendToTelegram('name', { '@type': 'getMe' })
    // Let the first request fail before moving the clock
    for (let i = 0; i < 10; i++) await Promise.resolve()
    deepEqual(getRequestTypes(), ['getMe'])
    t.mock.timers.tick(3000)
    deepEqual(await retried, USER)
    deepEqual(getRequestTypes(), ['getMe', 'getMe'])
    t.mock.timers.reset()

    testTelegram.requests = []
    testTelegram.answers.getMe = fail('Too Many Requests: retry after 60', 429)
    await rejects(sendToTelegram('name', { '@type': 'getMe' }), {
      name: 'TelegramError'
    })
    deepEqual(getRequestTypes(), ['getMe'])
  })

  test('sends requests by their urgency', async () => {
    let answers: Record<string, () => void> = {}
    testTelegram.answers.getUser = ({ user_id: id }) => {
      return new Promise(resolve => {
        answers[String(id)] = () => {
          resolve(USER)
        }
      })
    }
    function send(
      id: string,
      urgency?: 'later' | 'soon'
    ): Promise<TelegramObject> {
      return sendToTelegram(
        'name',
        { '@type': 'getUser', 'user_id': id },
        urgency
      )
    }
    function getSent(): unknown[] {
      return testTelegram.requests.map(i => i.user_id)
    }
    // Fake TDLib takes the request in the next tick
    async function answer(id: string): Promise<void> {
      await setTimeout(1)
      answers[id]!()
      await setTimeout(1)
    }

    let sending = [
      send('refresh1', 'later'),
      send('refresh2', 'later'),
      send('refresh3', 'later'),
      send('rest1', 'soon'),
      send('rest2', 'soon'),
      send('screen1'),
      send('screen2')
    ]
    // Only `now` requests take the last place
    deepEqual(getSent(), ['refresh1', 'refresh2', 'screen1'])

    await answer('refresh1')
    deepEqual(getSent(), ['refresh1', 'refresh2', 'screen1', 'screen2'])
    await answer('screen1')
    deepEqual(getSent().slice(4), ['rest1'])
    await answer('screen2')
    deepEqual(getSent().slice(4), ['rest1'])
    await answer('refresh2')
    deepEqual(getSent().slice(4), ['rest1', 'rest2'])
    await answer('rest1')
    deepEqual(getSent().slice(4), ['rest1', 'rest2', 'refresh3'])

    await answer('rest2')
    await answer('refresh3')
    await Promise.all(sending)
  })

  /**
   * Takes both places of `later` requests. Every `step()` lets go only
   * the requests, which already wait for a place, and returns them.
   */
  function holdBackground(): { free(): void; step(): Promise<string[]> } {
    let held: (() => void)[] = []
    testTelegram.answers.getMe = () => {
      return new Promise(resolve => {
        held.push(() => {
          resolve(USER)
        })
      })
    }
    function hold(): void {
      void sendToTelegram('name', { '@type': 'getMe' }, 'later')
    }
    hold()
    hold()
    return {
      free() {
        for (let answer of held.splice(0)) answer()
      },
      async step() {
        // Fake TDLib takes the request in the next tick
        await setTimeout(1)
        hold()
        held.shift()!()
        await setTimeout(10)
        let sent = getRequestTypes().filter(type => type !== 'getMe')
        testTelegram.requests = []
        return sent
      }
    }
  }

  test('loads posts and media for background as background', async () => {
    let { getMedia, getPosts } = loaders.telegram
    deviceSessions.set({ own: { device: 'name', service: 'telegram' } })
    let auth = {
      account: testAccount({ credentials: null, service: 'telegram' }),
      device: 'name',
      expire: () => Promise.resolve(),
      reload: () => Promise.resolve(undefined),
      save: () => Promise.resolve()
    }
    let refresh = createDownloadTask({ background: true })
    mockHistory(0, {
      0: [
        rich(4, [paragraph(plain('Cut'))], false),
        message(3, {
          forward_info: {
            '@type': 'messageForwardInfo',
            'origin': { '@type': 'messageOriginUser', 'sender_user_id': 5 }
          }
        }),
        message(2, {
          forward_info: {
            '@type': 'messageForwardInfo',
            'origin': { '@type': 'messageOriginChannel', 'chat_id': -1009 }
          }
        }),
        message(1, {
          reply_to: {
            '@type': 'messageReplyToMessage',
            'chat_id': -1000000000005,
            'message_id': 9 * 1048576
          }
        })
      ]
    })
    testTelegram.answers.getFullRichMessage = {
      '@type': 'richMessage',
      'blocks': [paragraph(plain('Full')), richPhoto(81)],
      'is_full': true
    }
    testTelegram.answers.getUser = USER
    testTelegram.answers.getSupergroup = { '@type': 'supergroup' }
    testTelegram.answers.getMessages = {
      '@type': 'messages',
      'messages': [message(9)]
    }
    testTelegram.answers.searchPublicChat = news(-1000000000005, 0)
    testTelegram.answers.checkChatInviteLink = {
      '@type': 'chatInviteLinkInfo',
      'chat_id': -1000000000005
    }
    let priorities: unknown[] = []
    testTelegram.answers.downloadFile = ({ file_id: id, priority }) => {
      priorities.push(priority)
      return { '@type': 'file', id, 'size': 6 }
    }
    testTelegram.answers.deleteFile = { '@type': 'ok' }
    testTelegram.files = {
      12: new Blob(['page']),
      61: new Blob(['avatar']),
      82: new Blob(['photo'])
    }
    let { step } = holdBackground()

    let posts = getPosts(
      refresh,
      'https://t.me/c/5',
      undefined,
      undefined,
      '{"id":"-1000000000005"}',
      auth
    )
    deepEqual(await step(), ['getChat'])
    deepEqual(await step(), ['getChatHistory'])
    deepEqual(await step(), ['getFullRichMessage'])
    deepEqual(await step(), ['getUser', 'getChat'])
    deepEqual(await step(), ['getSupergroup'])
    deepEqual(await step(), ['getMessages'])
    await posts.loading
    equal(posts.get().error, undefined)
    equal(posts.get().list.length, 4)

    testTelegram.answers.getMessage = rich(2, [paragraph(plain('Cut'))], false)
    let picture = getMedia!('telegram:5/2/0', undefined, undefined, 'later')!
    deepEqual(await step(), ['getChat'])
    deepEqual(await step(), ['getMessage'])
    deepEqual(await step(), [
      'getFullRichMessage',
      'downloadFile',
      'deleteFile'
    ])
    equal(await (await picture).text(), 'photo')

    let avatar = getMedia!(
      'telegram:user/5/avatar/a1',
      undefined,
      undefined,
      'later'
    )!
    deepEqual(await step(), ['getUser', 'downloadFile', 'deleteFile'])
    equal(await (await avatar).text(), 'avatar')
    deepEqual(priorities, [1, 1])

    mockHistory(0, { 0: [message(1)] })
    let named = getPosts(
      refresh,
      'https://t.me/news',
      undefined,
      undefined,
      undefined,
      auth
    )
    deepEqual(await step(), ['searchPublicChat'])
    deepEqual(await step(), ['getChatHistory'])
    await named.loading
    equal(named.get().list.length, 1)

    let invited = getPosts(
      refresh,
      'https://t.me/+code',
      undefined,
      undefined,
      undefined,
      auth
    )
    deepEqual(await step(), ['checkChatInviteLink'])
    deepEqual(await step(), ['getChat'])
    deepEqual(await step(), ['getChatHistory'])
    await invited.loading
    equal(invited.get().list.length, 1)

    // Page does not wait for the busy background
    testTelegram.answers.getMessage = photoPost
    equal(await (await getMedia!('telegram:5/4')!).text(), 'page')
    deepEqual(priorities, [1, 1, 16])
    let popup = getPosts(task, 'https://t.me/news')
    await popup.loading
    equal(popup.get().list.length, 1)
  })

  test('refreshes posts by background requests', async () => {
    let now = Math.round(Date.now() / 1000)
    let accountId = await addAccount(
      testAccount({
        credentials: null,
        followsSyncedAt: now,
        service: 'telegram'
      })
    )
    deviceSessions.set({ [accountId]: { device: 'name', service: 'telegram' } })
    await addFeed(
      testFeed({
        accountId,
        lastOriginId: '5',
        lastPublishedAt: 1005,
        loader: 'telegram',
        loaderData: '{"id":"-1001"}',
        reading: 'slow',
        refreshedAt: now - 60,
        url: 'https://t.me/c/1'
      })
    )
    mockChatList([
      news(-1001, 5, {
        last_message: message(7),
        positions: [position(now - 30)]
      })
    ])
    testTelegram.answers.getChatHistory = {
      '@type': 'messages',
      'messages': [message(6), message(5)]
    }
    let { free } = holdBackground()

    let refreshing = refreshPosts()
    await waitUntil(() => getRequestTypes().includes('loadChats'))
    await setTimeout(50)
    equal(getRequestTypes().includes('getChatHistory'), false)

    free()
    await refreshing
    deepEqual(refreshErrors.get(), [])
    equal(getRequestTypes().includes('getChatHistory'), true)
    equal((await loadPosts()).length, 2)
  })

  test('forgets the file of a deleted post', async t => {
    t.after(() => {
      cacheMediaReading.set('all')
    })
    cacheMediaReading.set('slow')
    mockHistory(0, {})
    testTelegram.answers.getMessage = photoPost
    testTelegram.answers.downloadFile = { '@type': 'file', 'id': 12, 'size': 5 }
    testTelegram.answers.deleteFile = { '@type': 'ok' }
    testTelegram.files = { 12: new Blob(['photo']) }
    let id = await addPost(
      testPost({
        media: [{ type: 'image', url: 'telegram:5/4' }],
        reading: 'fast'
      })
    )
    await syncMediaCache()
    deviceSessions.set({ own: { device: 'name', service: 'telegram' } })

    await loadMediaBlob('telegram:5/4')
    await setTimeout(10)
    testTelegram.requests = []
    await loadMediaBlob('telegram:5/4')
    deepEqual(getDownloads(), [])

    await deletePost(id)
    await loadMediaBlob('telegram:5/4')
    deepEqual(getDownloads(), [[16, true]])
  })

  function getDownloads(): unknown[] {
    return testTelegram.requests
      .filter(i => i['@type'] === 'downloadFile')
      .map(i => [i.priority, i.synchronous])
  }

  test('downloads the file of the page before files for the cache', async () => {
    let { getMedia } = loaders.telegram
    deviceSessions.set({ own: { device: 'name', service: 'telegram' } })
    mockHistory(0, {})
    testTelegram.answers.getMessage = photoPost
    let finish: (() => void) | undefined
    testTelegram.answers.downloadFile = ({ file_id: id, synchronous }) => {
      let downloaded = { '@type': 'file', id, 'size': 5 }
      if (!synchronous) return downloaded
      return new Promise(resolve => {
        finish = () => {
          resolve(downloaded)
        }
      })
    }
    let clean: (() => void) | undefined
    testTelegram.answers.deleteFile = () => {
      return new Promise(resolve => {
        clean = () => {
          resolve({ '@type': 'ok' })
        }
      })
    }
    testTelegram.files = { 12: new Blob(['photo']) }

    let cache = getMedia!('telegram:5/4', undefined, undefined, 'later')!
    await setTimeout(10)
    deepEqual(getDownloads(), [[1, true]])

    let below = getMedia!('telegram:5/4', undefined, undefined, 'soon')!
    await setTimeout(10)
    deepEqual(getDownloads(), [
      [1, true],
      [8, false]
    ])

    let feed = getMedia!('telegram:5/4')!
    let popup = getMedia!('telegram:5/4')!
    let other = getMedia!('telegram:5/4', undefined, undefined, 'soon')!
    await setTimeout(10)
    deepEqual(getDownloads(), [
      [1, true],
      [8, false],
      [16, false]
    ])
    finish!()
    await setTimeout(10)
    clean!()
    for (let reader of [cache, below, feed, popup, other]) {
      equal(await (await reader).text(), 'photo')
    }

    // TDLib would start a new download of the file, which it already has
    testTelegram.requests = []
    let saved = getMedia!('telegram:5/4', undefined, undefined, 'later')!
    await setTimeout(10)
    finish!()
    await setTimeout(10)
    let late = getMedia!('telegram:5/4')!
    await setTimeout(10)
    deepEqual(getDownloads(), [[1, true]])
    clean!()
    equal(await (await saved).text(), 'photo')
    equal(await (await late).text(), 'photo')

    testTelegram.requests = []
    let first = getMedia!('telegram:5/4')!
    let second = getMedia!('telegram:5/4', undefined, undefined, 'later')!
    await setTimeout(10)
    deepEqual(getDownloads(), [[16, true]])
    finish!()
    await setTimeout(10)
    clean!()
    equal(await (await first).text(), 'photo')
    equal(await (await second).text(), 'photo')
  })

  test('loads media on the screen before the rest of the page', async () => {
    deviceSessions.set({ own: { device: 'name', service: 'telegram' } })
    mockHistory(0, {})
    let posts: (() => void)[] = []
    testTelegram.answers.getMessage = photoPost
    let finish: (() => void) | undefined
    testTelegram.answers.downloadFile = ({ file_id: id, synchronous }) => {
      let downloaded = { '@type': 'file', id, 'size': 5 }
      if (!synchronous) return downloaded
      return new Promise(resolve => {
        finish = () => {
          resolve(downloaded)
        }
      })
    }
    testTelegram.answers.deleteFile = { '@type': 'ok' }
    testTelegram.answers.cancelDownloadFile = { '@type': 'ok' }
    testTelegram.files = { 12: new Blob(['photo']) }
    let page = new AbortController()

    equal(
      loadPageMedia('https://example.com/a.jpg', false, page.signal),
      undefined
    )

    let shown = loadPageMedia('telegram:5/4', false, page.signal)!
    shown.setPlace('far')
    await setTimeout(10)
    deepEqual(testTelegram.requests, [])
    shown.setPlace('screen')
    shown.setPlace('near')
    shown.setPlace('screen')
    await setTimeout(10)
    deepEqual(getDownloads(), [[16, true]])
    finish!()
    equal(await (await shown.blob).text(), 'photo')

    // Another place of the page gets the same file without a new download
    await setTimeout(10)
    testTelegram.requests = []
    let popup = loadPageMedia('telegram:5/4', false, page.signal)!
    popup.setPlace('near')
    equal(await (await popup.blob).text(), 'photo')
    deepEqual(testTelegram.requests, [])

    let below = loadPageMedia('telegram:5/5', false, page.signal)!
    below.setPlace('near')
    below.setPlace('near')
    await setTimeout(10)
    deepEqual(getDownloads(), [[8, true]])
    below.setPlace('screen')
    await setTimeout(10)
    deepEqual(getDownloads(), [
      [8, true],
      [16, false]
    ])
    finish!()
    equal(await (await below.blob).text(), 'photo')
    await setTimeout(10)
    testTelegram.requests = []
    below.setPlace('screen')
    below.setPlace('far')
    await setTimeout(10)
    deepEqual(testTelegram.requests, [])

    // Error of the slow loading does not hide the file of the fast one
    testTelegram.answers.getMessage = () => {
      return new Promise(resolve => {
        posts.push(() => {
          resolve(posts.length === 2 ? fail('Not found', 404) : photoPost)
        })
      })
    }
    let retried = loadPageMedia('telegram:5/6', false, page.signal)!
    retried.setPlace('near')
    await setTimeout(10)
    retried.setPlace('screen')
    await setTimeout(10)
    posts[0]!()
    await setTimeout(10)
    posts.pop()!()
    await setTimeout(10)
    finish!()
    equal(await (await retried.blob).text(), 'photo')

    testTelegram.answers.getMessage = fail('Not found', 404)
    let broken = loadPageMedia('telegram:5/7', false, page.signal)!
    broken.setPlace('near')
    await rejects(broken.blob, { name: 'TelegramError' })
    testTelegram.requests = []
    broken.setPlace('screen')
    await setTimeout(10)
    deepEqual(testTelegram.requests, [])

    testTelegram.answers.getMessage = photoPost
    let left = loadPageMedia('telegram:5/8', false, page.signal)!
    left.setPlace('screen')
    await setTimeout(10)
    page.abort()
    await rejects(left.blob, { name: 'AbortError' })
    testTelegram.requests = []
    left.setPlace('screen')
    await setTimeout(10)
    deepEqual(testTelegram.requests, [])
    await rejects(loadMediaBlob('telegram:5/8', false, page.signal)!, {
      name: 'AbortError'
    })
  })

  test('forgets media, which user scrolled away', async () => {
    deviceSessions.set({ own: { device: 'name', service: 'telegram' } })
    mockHistory(0, {})
    let answer: (() => void) | undefined
    testTelegram.answers.getMessage = () => {
      return new Promise(resolve => {
        answer = () => {
          resolve(photoPost)
        }
      })
    }
    let finish: (() => void) | undefined
    testTelegram.answers.downloadFile = ({ file_id: id, synchronous }) => {
      let downloaded = { '@type': 'file', id, 'size': 5 }
      if (!synchronous) return downloaded
      return new Promise(resolve => {
        finish = () => {
          resolve(downloaded)
        }
      })
    }
    testTelegram.answers.deleteFile = { '@type': 'ok' }
    testTelegram.files = { 12: new Blob(['photo']) }
    let page = new AbortController()

    let passed = loadPageMedia('telegram:5/4', false, page.signal)!
    passed.setPlace('near')
    passed.setPlace('far')
    await setTimeout(10)
    deepEqual(testTelegram.requests, [])

    passed.setPlace('near')
    await setTimeout(10)
    passed.setPlace('far')
    answer!()
    await setTimeout(10)
    deepEqual(getDownloads(), [])

    passed.setPlace('near')
    await setTimeout(10)
    answer!()
    await setTimeout(10)
    deepEqual(getDownloads(), [[8, true]])

    // A started photo is finished for the user, who scrolls back
    passed.setPlace('far')
    let popup = loadPageMedia('telegram:5/4', false, page.signal)!
    popup.setPlace('screen')
    await setTimeout(10)
    answer!()
    await setTimeout(10)
    deepEqual(getDownloads(), [
      [8, true],
      [16, false]
    ])
    page.abort()
    await rejects(popup.blob, { name: 'AbortError' })
    finish!()
    await setTimeout(10)
    testTelegram.requests = []
    equal(await (await loadMediaBlob('telegram:5/4')!).text(), 'photo')
    deepEqual(testTelegram.requests, [])
  })

  test('asks for a failed file once more', async () => {
    deviceSessions.set({ own: { device: 'name', service: 'telegram' } })
    mockHistory(0, {})
    let asked = 0
    testTelegram.answers.getMessage = () => {
      asked += 1
      return asked === 1 ? fail('Timeout', 500) : photoPost
    }
    testTelegram.answers.downloadFile = { '@type': 'file', 'id': 12, 'size': 5 }
    testTelegram.answers.deleteFile = { '@type': 'ok' }
    testTelegram.files = { 12: new Blob(['photo']) }
    equal(await (await loadMediaBlob('telegram:5/4')!).text(), 'photo')
    equal(asked, 2)

    testTelegram.answers.getMessage = () => {
      asked += 1
      return fail('Not found', 404)
    }
    await rejects(loadMediaBlob('telegram:5/5')!, { name: 'TelegramError' })
    equal(asked, 4)
  })

  test('downloads more files at once for Premium account', async () => {
    let { getMedia } = loaders.telegram
    deviceSessions.set({ own: { device: 'name', service: 'telegram' } })
    mockHistory(0, {})
    testTelegram.answers.getMessage = ({ message_id: id }) => {
      return message(Number(id) / 1048576, {
        content: {
          '@type': 'messagePhoto',
          'photo': {
            '@type': 'photo',
            'sizes': [
              {
                height: 500,
                photo: file(Number(id) / 1048576, 900_000),
                width: 800
              }
            ]
          }
        }
      })
    }
    let finish: (() => void)[] = []
    testTelegram.answers.downloadFile = ({ file_id: id }) => {
      return new Promise(resolve => {
        finish.push(() => {
          resolve({ '@type': 'file', id, 'size': 4 })
        })
      })
    }
    testTelegram.answers.deleteFile = { '@type': 'ok' }
    testTelegram.files = Object.fromEntries(
      Array.from({ length: 17 }, (_, id) => [id + 1, new Blob(['file'])])
    )
    async function countStarted(posts: number[]): Promise<number> {
      let loading = posts.map(post => getMedia!(`telegram:5/${post}`)!)
      await setTimeout(10)
      let started = finish.length
      for (let i = 0; i < posts.length; i++) {
        for (let end of finish.splice(0)) end()
        await setTimeout(10)
      }
      await Promise.all(loading)
      return started
    }

    equal(await countStarted([1, 2, 3, 4, 5]), 3)
    sendTelegramUpdate({
      '@type': 'updateOption',
      'name': 'is_premium',
      'value': { '@type': 'optionValueBoolean', 'value': true }
    })
    equal(await countStarted([6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]), 10)
  })

  test('keeps loaded files in the memory for other places', async () => {
    deviceSessions.set({ own: { device: 'name', service: 'telegram' } })
    mockHistory(0, {})
    testTelegram.answers.getMessage = ({ message_id: id }) => {
      return id === 5 * 1048576 ? previewPost : photoPost
    }
    let big = new Blob(['a'.repeat(20 * 1024 * 1024)])
    testTelegram.answers.downloadFile = ({ file_id: id }) => {
      return { '@type': 'file', id, 'size': big.size }
    }
    testTelegram.answers.deleteFile = { '@type': 'ok' }
    testTelegram.files = { 12: big, 31: big }

    let feed = new AbortController()
    let below = loadMediaBlob('telegram:5/4', false, feed.signal, 'soon')!
    await loadMediaBlob('telegram:5/4')
    await below
    deepEqual(getDownloads(), [[16, true]])

    equal(
      await chooseMediaCopy(
        {
          copies: [{ url: 'telegram:5/4/x', width: 800 }],
          url: 'telegram:5/4'
        },
        500
      ),
      'telegram:5/4'
    )

    feed.abort()
    await loadMediaBlob('telegram:5/4')
    equal(getDownloads().length, 1)

    // Memory for files, which nobody shows, has a limit
    await loadMediaBlob('telegram:5/5/preview')
    await loadMediaBlob('telegram:5/4')
    equal(getDownloads().length, 3)
  })

  test('finds channel by URL and follows it', async () => {
    let auth = {
      account: testAccount({ credentials: null, service: 'telegram' }),
      device: 'name',
      expire: () => Promise.resolve(),
      reload: () => Promise.resolve(undefined),
      save: () => Promise.resolve()
    }
    let { telegram } = loaders
    let page = createTextResponse('', { url: 'https://t.me/news' })
    equal(telegram.detectFeedInPage(task, page, page.url), false)
    deepEqual(telegram.getMineLinksFromText(page), [])
    deepEqual(telegram.getSuggestedLinksFromText(page), [])
    equal(await telegram.getPostSource(testFeed(), '1'), undefined)
    equal(account.getTimeline, undefined)

    for (let url of [
      'https://example.com/news',
      'https://t.me/addstickers/pack',
      'https://t.me/share/url',
      'https://t.me/c/name'
    ]) {
      equal(telegram.isMineUrl(task, new URL(url)), false)
    }
    equal(await telegram.isMineUrl(task, new URL('https://t.me/news')), false)

    deviceSessions.set({
      other: { device: 'other', service: 'mastodon' },
      own: { device: 'name', service: 'telegram' }
    })
    mockHistory(0, {
      0: [message(3)],
      1: [],
      3: [message(2), message(1)]
    })
    let status = 'chatMemberStatusLeft'
    testTelegram.answers.getSupergroup = ({ supergroup_id: id }) => ({
      '@type': 'supergroup',
      'status': { '@type': status },
      'usernames': {
        '@type': 'usernames',
        'active_usernames': id === 7 ? ['News'] : []
      }
    })
    testTelegram.answers.searchPublicChat = ({ username }) => {
      if (username === 'news') return news(-1000000000007, 0)
      if (username === 'group') {
        return { '@type': 'chat', 'type': { '@type': 'chatTypeBasicGroup' } }
      }
      return fail('Not found', 404)
    }

    deepEqual(
      await telegram.isMineUrl(task, new URL('https://t.me/s/news/12')),
      { title: 'News', url: 'https://t.me/News' }
    )
    deepEqual(
      await telegram.isMineUrl(task, new URL('https://telegram.me/c/8/1')),
      { title: 'News', url: 'https://t.me/c/8' }
    )
    await rejects(
      telegram.isMineUrl(task, new URL('https://t.me/group')) as Promise<false>,
      new UserFacingError(accountsMessages.get().telegramOnlyChannels)
    )
    equal(await telegram.isMineUrl(task, new URL('https://t.me/lost')), false)

    equal(
      await telegram.getLoaderData!(task, 'https://t.me/news'),
      '{"id":"-1000000000007"}'
    )
    deepEqual(await telegram.loadFeedData(task, 'https://t.me/news'), {
      title: 'News',
      url: 'https://t.me/news'
    })
    equal(telegram.isFinalUnfollow!('https://t.me/news'), false)
    equal(telegram.isFinalUnfollow!('https://t.me/c/8'), true)

    // Feed’s preview asks for the second page at once
    let posts = telegram.getPosts(task, 'https://t.me/news')
    await posts.loading
    deepEqual(
      posts.get().list.map(post => post.url),
      ['https://t.me/news/3', 'https://t.me/news/2', 'https://t.me/news/1']
    )

    equal(await account.isFollowing(auth, 'https://t.me/news'), false)
    status = 'chatMemberStatusMember'
    equal(await account.isFollowing(auth, 'https://t.me/news'), true)

    testTelegram.answers.joinChat = { '@type': 'ok' }
    testTelegram.answers.leaveChat = { '@type': 'ok' }
    testTelegram.requests = []
    await account.follow(auth, 'https://t.me/news')
    await account.unfollow(auth, 'https://t.me/c/8')
    deepEqual(
      testTelegram.requests.filter(i => /^(join|leave)Chat$/.test(i['@type'])),
      [
        { '@type': 'joinChat', 'chat_id': -1000000000007 },
        { '@type': 'leaveChat', 'chat_id': -1000000000008 }
      ]
    )
    await rejects(account.follow(auth, 'https://example.com/'), {
      message: 'Not a channel URL'
    })

    testTelegram.answers.searchPublicChat = () => {
      throw new Error('TDLib is broken')
    }
    await rejects(
      telegram.isMineUrl(task, new URL('https://t.me/news')) as Promise<false>,
      { message: 'TDLib is broken' }
    )
  })

  test('previews, follows, and leaves channel in feed popup', async () => {
    // Telegram has no anonymous feeds, so the account follows the channel
    // also without the setting to follow on subscribing
    let accountId = await addAccount(
      testAccount({ credentials: null, service: 'telegram' })
    )
    deviceSessions.set({ [accountId]: { device: 'name', service: 'telegram' } })
    mockHistory(0, { 0: [message(3)], 3: [message(2)] })
    testTelegram.answers.searchPublicChat = ({ username }) => {
      return username === 'news' ? news(-1000000000007, 0) : fail('No', 404)
    }
    let status = 'chatMemberStatusLeft'
    testTelegram.answers.getSupergroup = {
      '@type': 'supergroup',
      'status': { '@type': status },
      'usernames': { '@type': 'usernames', 'active_usernames': ['news'] }
    }
    testTelegram.answers.joinChat = { '@type': 'ok' }
    testTelegram.answers.leaveChat = { '@type': 'ok' }

    let opened = openTestPopup('feed', 'https://t.me/news')
    await waitLoading(opened.loading)
    let popup = checkLoadedPopup(opened)
    equal(popup.title, 'News')
    equal(popup.finalUnfollow, false)
    equal(popup.noAnonymous, true)
    equal(popup.followedBy.get(), undefined)
    deepEqual(
      popup.previews.get().map(post => post.url),
      ['https://t.me/news/3', 'https://t.me/news/2']
    )

    let feedId = await popup.add()
    let feed = (await loadFeed(feedId!))!
    equal(feed.accountId, accountId)
    equal(feed.loaderData, '{"id":"-1000000000007"}')
    equal(feed.lastOriginId, '3')

    await popup.remove()
    deepEqual(await loadFeeds(), [])
    deepEqual(
      testTelegram.requests.filter(i => /^(join|leave)Chat$/.test(i['@type'])),
      [
        { '@type': 'joinChat', 'chat_id': -1000000000007 },
        { '@type': 'leaveChat', 'chat_id': -1000000000007 }
      ]
    )

    closeLastPopup()
    await changeAccount(accountId, { expired: true })
    let reopened = openTestPopup('feed', 'https://t.me/news')
    await waitLoading(reopened.loading)
    let expired = checkLoadedPopup(reopened)
    equal(await expired.add(), undefined)
    equal(expired.accountError.get(), accountsMessages.get().signInOnDevice)
    deepEqual(await loadFeeds(), [])

    let missing = openTestPopup('feed', 'https://t.me/lost')
    await waitLoading(missing.loading)
    equal(missing.notFound, true)
  })

  test('shows posts of saved channel after its username change', async () => {
    let accountId = await addAccount(
      testAccount({ credentials: null, service: 'telegram' })
    )
    deviceSessions.set({ [accountId]: { device: 'name', service: 'telegram' } })
    await addFeed(
      testFeed({
        accountId,
        loader: 'telegram',
        loaderData: '{"id":"-1000000000007"}',
        url: 'https://t.me/oldname'
      })
    )
    mockHistory(0, { 0: [message(3)], 3: [message(2)] })
    testTelegram.answers.searchPublicChat = fail('USERNAME_NOT_OCCUPIED')

    let opened = openTestPopup('feed', 'https://t.me/oldname')
    await waitLoading(opened.loading)
    let popup = checkLoadedPopup(opened)
    await popup.posts.loading
    equal(popup.posts.get().error, undefined)
    deepEqual(
      popup.posts.get().list.map(post => post.url),
      ['https://t.me/oldname/3', 'https://t.me/oldname/2']
    )
    equal(
      testTelegram.requests.some(i => i['@type'] === 'searchPublicChat'),
      false
    )

    await addFeed(
      testFeed({ accountId, loader: 'telegram', url: 'https://t.me/noidname' })
    )
    let withoutId = openTestPopup('feed', 'https://t.me/noidname')
    await waitLoading(withoutId.loading)
    await checkLoadedPopup(withoutId).posts.loading
    equal(
      String(checkLoadedPopup(withoutId).posts.get().error),
      'TelegramError: USERNAME_NOT_OCCUPIED'
    )
  })

  test('loads avatars of account, channels, and forward sources', async () => {
    function avatarOf(fileId: number, unique: string): object {
      return {
        small: {
          '@type': 'file',
          'id': fileId,
          'remote': { unique_id: unique }
        }
      }
    }
    let { telegram } = loaders
    deviceSessions.set({ own: { device: 'name', service: 'telegram' } })

    mockChats({ 1: ['news'] })
    let loadChat = testTelegram.answers.getChat as (
      request: TelegramObject
    ) => TelegramObject
    testTelegram.answers.getChat = request => ({
      ...loadChat(request),
      photo: avatarOf(71, 'a-1')
    })
    deepEqual(
      (
        await account.getFollows({
          account: testAccount({ credentials: null, service: 'telegram' }),
          device: 'name',
          expire: () => Promise.resolve(),
          reload: () => Promise.resolve(undefined),
          save: () => Promise.resolve()
        })
      ).map(author => author.avatar),
      ['telegram:1/avatar/a-1', 'telegram:2/avatar/a-1']
    )

    function forward(origin: object): object {
      return { forward_info: { '@type': 'messageForwardInfo', origin } }
    }
    mockHistory(0, {
      0: [
        message(
          2,
          forward({ '@type': 'messageOriginUser', 'sender_user_id': 5 })
        ),
        message(
          1,
          forward({
            '@type': 'messageOriginChannel',
            'chat_id': -1000000000009
          })
        )
      ]
    })
    testTelegram.answers.getChat = ({ chat_id: id }) => ({
      ...news(id, 0),
      photo: avatarOf(72, 'b_2')
    })
    testTelegram.answers.getUser = {
      '@type': 'user',
      'first_name': 'Bob',
      'id': 5,
      'last_name': '',
      'profile_photo': avatarOf(73, 'c3')
    }
    testTelegram.answers.getSupergroup = { '@type': 'supergroup' }
    deepEqual(
      (await loadFeedPosts('{"id":"-1000000000005"}')).map(post => [
        post.author?.avatar,
        post.repostedBy?.avatar
      ]),
      [
        ['telegram:user/5/avatar/c3', 'telegram:5/avatar/b_2'],
        ['telegram:9/avatar/b_2', 'telegram:5/avatar/b_2']
      ]
    )
    deepEqual(await telegram.loadFeedData(task, 'https://t.me/c/5'), {
      avatar: 'telegram:5/avatar/b_2',
      title: 'News',
      url: 'https://t.me/c/5'
    })

    testTelegram.answers.downloadFile = ({ file_id: id }) => ({
      '@type': 'file',
      id,
      'size': 6
    })
    testTelegram.files = { 72: new Blob(['avatar']), 73: new Blob(['person']) }
    let avatar = await telegram.getMedia!('telegram:5/avatar/b_2')!
    equal(avatar.headers.get('Content-Type'), 'image/jpeg')
    equal(await avatar.text(), 'avatar')
    let person = await telegram.getMedia!('telegram:user/5/avatar/c3')!
    equal(await person.text(), 'person')

    testTelegram.answers.getChat = ({ chat_id: id }) => news(id, 0)
    await rejects(telegram.getMedia!('telegram:5/avatar/b_2')!, {
      message: 'No Telegram avatar'
    })
  })

  test('finds channel on Add page by link and by handle', async () => {
    let accountId = await addAccount(
      testAccount({ credentials: null, service: 'telegram' })
    )
    deviceSessions.set({ [accountId]: { device: 'name', service: 'telegram' } })
    mockHistory(0, { 0: [message(3)], 3: [message(2)] })
    testTelegram.answers.searchPublicChat = ({ username }) => {
      if (username === 'news') return news(-1000000000007, 0)
      if (username === 'durov') {
        return { '@type': 'chat', 'type': { '@type': 'chatTypePrivate' } }
      }
      return fail('No', 404)
    }
    testTelegram.answers.getSupergroup = {
      '@type': 'supergroup',
      'usernames': { '@type': 'usernames', 'active_usernames': ['news'] }
    }

    let page = openPage({ params: {}, route: 'add' })
    keepMount(page.searching)
    keepMount(page.candidates)
    page.search('https://t.me/news')
    await waitLoading(page.searching)
    equal(page.error.get(), undefined)
    deepEqual(
      page.candidates.get().map(i => `${i.name} ${i.title} ${i.url}`),
      ['telegram News https://t.me/news']
    )

    page.search('@news')
    await waitLoading(page.searching)
    equal(page.error.get(), undefined)
    deepEqual(
      page.candidates.get().map(i => `${i.name} ${i.title} ${i.url}`),
      ['telegram News https://t.me/news']
    )

    page.search('@lost')
    await waitLoading(page.searching)
    equal(page.noResults.get(), true)

    for (let user of ['https://t.me/durov', '@durov']) {
      page.search(user)
      await waitLoading(page.searching)
      equal(page.error.get(), accountsMessages.get().telegramOnlyChannels)
    }

    // Telegram’s limit of name searches should not look like unknown channel
    testTelegram.answers.searchPublicChat = fail('Too Many Requests', 429)
    await expectWarning(async () => {
      page.search('https://t.me/news')
      await waitLoading(page.searching)
    }, [new TelegramError(429, 'Too Many Requests')])
    equal(page.error.get(), addMessages.get().unloadable)

    deviceSessions.set({})
    deepEqual(await loaders.telegram.getProfilesByHandle!(task, '@news'), [])
    deepEqual(await loaders.telegram.getProfilesByHandle!(task, '@a@b.c'), [])
  })

  test('opens channels and posts by links from the text', async () => {
    let { telegram } = loaders
    // Without a session the link goes to Telegram’s site
    equal(getLinkPopup('link', 'https://t.me/news', 'mastodon'), undefined)
    equal(getLinkPopup('link', 'https://t.me/news/3', 'mastodon'), undefined)

    deviceSessions.set({ own: { device: 'name', service: 'telegram' } })
    equal(getLinkPopup('link', 'https://t.me/news', 'mastodon'), 'feed')
    equal(getLinkPopup('link', 'https://t.me/s/news/3', 'mastodon'), 'post')
    equal(getLinkPopup('link', 'https://t.me/c/7/3', 'mastodon'), 'post')
    equal(
      getLinkPopup('link', 'https://t.me/addstickers/pack', 'mastodon'),
      undefined
    )

    mockHistory(0, {})
    testTelegram.answers.searchPublicChat = ({ username }) => {
      return username === 'news'
        ? news(-1000000000007, 0)
        : { '@type': 'chat', 'type': { '@type': 'chatTypeBasicGroup' } }
    }
    testTelegram.answers.getSupergroup = {
      '@type': 'supergroup',
      'usernames': { '@type': 'usernames', 'active_usernames': ['news'] }
    }
    testTelegram.answers.getMessage = ({ message_id: id }) => {
      return Number(id) === 3 * 1048576
        ? message(3)
        : message(4, { content: { '@type': 'messagePinMessage' } })
    }

    let post = await telegram.getPostByUrl!(task, 'https://t.me/news/3')
    deepEqual(
      [post.id, post.author, post.full, post.originId, post.url],
      [
        'https://t.me/news/3',
        { title: 'News', url: 'https://t.me/news' },
        '<p>Post 3</p>',
        '3',
        'https://t.me/news/3'
      ]
    )
    await rejects(telegram.getPostByUrl!(task, 'https://t.me/news/4'), {
      name: 'NotFoundError'
    })

    let opened = openTestPopup('post', 'https://t.me/news/3')
    await waitLoading(opened.loading)
    equal(checkLoadedPopup(opened).post.get().full, '<p>Post 3</p>')

    // Mention of a user or a link to group’s message looks like channel’s one
    for (let [name, param] of [
      ['feed', 'https://t.me/group'],
      ['post', 'read:https://t.me/group/3']
    ] as const) {
      let refused = openTestPopup(name, param)
      await waitLoading(refused.loading)
      equal(refused.error, accountsMessages.get().telegramOnlyChannels)
      equal(getPopupUrl(refused), param.replace('read:', ''))
    }
    equal(getPopupUrl(openTestPopup('account', 'id')), undefined)

    // Telegram has other forms of the same links, which would open its site
    let links = [
      'http://t.me/news',
      'https://telegram.me/news/3?single',
      'tg://resolve?domain=news',
      'tg://resolve?domain=news&post=3',
      'https://news.t.me',
      'http://news.t.me/3',
      'tg://join?invite=a-B_1',
      'https://example.com/a',
      'tg://settings',
      'https://'
    ]
    mockHistory(0, {
      0: [
        message(1, {
          content: {
            '@type': 'messageText',
            'text': {
              '@type': 'formattedText',
              'entities': links.map((url, index) => ({
                '@type': 'textEntity',
                'length': 1,
                'offset': index,
                'type': { '@type': 'textEntityTypeTextUrl', url }
              })),
              'text': 'abcdefghij'
            }
          }
        })
      ]
    })
    deepEqual(
      [...(await loadFeedPosts())[0]!.full!.matchAll(/href="([^"]+)"/g)].map(
        match => match[1]
      ),
      [
        'https://t.me/news',
        'https://t.me/news/3?single',
        'https://t.me/news',
        'https://t.me/news/3',
        'https://t.me/news',
        'https://t.me/news/3',
        'https://t.me/+a-B_1',
        'https://example.com/a',
        'tg://settings',
        'https://'
      ]
    )
  })

  test('joins private channel by invite link', async () => {
    let auth = {
      account: testAccount({ credentials: null, service: 'telegram' }),
      device: 'name',
      expire: () => Promise.resolve(),
      reload: () => Promise.resolve(undefined),
      save: () => Promise.resolve()
    }
    let { telegram } = loaders
    let link = 'https://t.me/+a-B_1'
    deviceSessions.set({ own: { device: 'name', service: 'telegram' } })
    mockHistory(0, { 0: [message(3)], 3: [] })
    testTelegram.answers.getSupergroup = { '@type': 'supergroup' }
    let chatId = 0
    let type = 'inviteLinkChatTypeChannel'
    testTelegram.answers.checkChatInviteLink = () => ({
      '@type': 'chatInviteLinkInfo',
      'chat_id': chatId,
      'title': 'Secret',
      'type': { '@type': type }
    })
    async function loadUrls(): Promise<(string | undefined)[]> {
      let posts = telegram.getPosts(task, link)
      await posts.loading
      if (posts.get().error) throw posts.get().error!
      return posts.get().list.map(post => post.url)
    }

    // Telegram gives only the title before the join
    equal(getLinkPopup('link', link, 'mastodon'), 'feed')
    deepEqual(await telegram.isMineUrl(task, new URL(link)), {
      title: 'Secret',
      url: link
    })
    deepEqual(
      await telegram.isMineUrl(task, new URL('https://t.me/joinchat/a-B_1')),
      { title: 'Secret', url: link }
    )
    deepEqual(await loadUrls(), [])
    type = 'inviteLinkChatTypeSupergroup'
    await rejects(
      telegram.isMineUrl(task, new URL(link)) as Promise<false>,
      new UserFacingError(accountsMessages.get().telegramOnlyChannels)
    )
    type = 'inviteLinkChatTypeChannel'

    testTelegram.answers.joinChatByInviteLink = {
      '@type': 'chatJoinResultSuccess',
      'chat_id': -1000000000008
    }
    await account.follow(auth, link)
    deepEqual(testTelegram.requests.at(-1), {
      '@type': 'joinChatByInviteLink',
      'invite_link': link
    })

    chatId = -1000000000008
    deepEqual(await telegram.isMineUrl(task, new URL(link)), {
      title: 'News',
      url: 'https://t.me/c/8'
    })
    equal(await telegram.getLoaderData!(task, link), '{"id":"-1000000000008"}')
    deepEqual(await loadUrls(), ['https://t.me/+a-B_1/3'])

    // Admin must approve the request, or channel’s bot asks for a check
    testTelegram.answers.joinChatByInviteLink = {
      '@type': 'chatJoinResultRequestSent'
    }
    await rejects(account.follow(auth, link), {
      message: accountsMessages.get().telegramJoinFailed
    })
    testTelegram.answers.joinChat = { '@type': 'chatJoinResultDeclined' }
    await rejects(account.follow(auth, 'https://t.me/c/8'), {
      message: accountsMessages.get().telegramJoinFailed
    })

    testTelegram.answers.checkChatInviteLink = fail('Too Many Requests', 429)
    await rejects(loadUrls(), { name: 'TelegramError' })
  })
})
