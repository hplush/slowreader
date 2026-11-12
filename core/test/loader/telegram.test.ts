import { encodeTelegramApp } from '@slowreader/api'
import { deepEqual, equal, rejects } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  accountsMessages,
  addAccount,
  addFeed,
  addPost,
  cacheMediaOnRequest,
  createDownloadTask,
  createTextResponse,
  deviceSessions,
  isMediaCached,
  loaders,
  loadFeed,
  loadFeeds,
  loadMediaBlob,
  loadPosts,
  type OriginPost,
  refreshErrors,
  refreshPosts,
  refreshStatistics,
  syncFollows,
  syncMediaCache,
  type TelegramObject,
  testAccount,
  testFeed,
  testPost,
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
          reading: 'slow',
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
          reading: 'slow',
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

  function mockHistory(
    lastRead: number,
    pages: Record<number, TelegramObject[]>
  ): void {
    testTelegram.answers.getChat = {
      '@type': 'chat',
      'id': -1001,
      'last_read_inbox_message_id': lastRead * 1048576,
      'title': 'News'
    }
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
        'Use <code>&lt;code&gt;</code> &amp; ' +
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
    function reply(post: number): object {
      return {
        reply_to: {
          '@type': 'messageReplyToMessage',
          'chat_id': -1001,
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
          }
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
        message(
          3,
          forward({ '@type': 'messageOriginChannel', 'chat_id': -1009 })
        ),
        message(2, reply(1)),
        message(1, reply(99))
      ]
    })
    let news = testTelegram.answers.getChat as TelegramObject
    testTelegram.answers.getChat = ({ chat_id: id }) => {
      if (id === -1001) {
        return news
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
    testTelegram.answers.getMessage = ({ message_id: id }) => {
      return id === 1048576 ? message(1) : fail('Not found', 404)
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
          replied: undefined,
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
          author: { title: 'Jane Doe', url: 'https://t.me/jane' },
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
          replied: undefined,
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
          media: [{ type: 'video', url: 'telegram:5/7' }],
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
          'priority': 1,
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

  test('gives media to the cache and to the page', async () => {
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
    await syncMediaCache()
    equal(await isMediaCached('telegram:5/5/preview'), true)
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
        task,
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
    deepEqual(
      await loaders.telegram.getDynamicPosts!(task, 'https://t.me/a'),
      []
    )
  })

  test('skips service messages and marks unknown content', async () => {
    mockHistory(9, {
      0: [message(9, { content: null }), message(8)],
      8: [
        message(7, { content: { '@type': 'messageVideoNote' } }),
        message(6, { content: { '@type': 'messagePinMessage' } })
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
      }
    ])
  })

  test('loads the chat list, when TDLib does not know the channel', async () => {
    mockHistory(1, { 0: [message(2)] })
    let chat = testTelegram.answers.getChat as TelegramObject
    let known = false
    testTelegram.answers.getChat = () => {
      return known ? chat : fail('Chat not found')
    }
    testTelegram.answers.loadChats = () => {
      known = true
      return fail('Not Found', 404)
    }
    deepEqual(
      (await loadFeedPosts()).map(post => post.originId),
      ['2']
    )

    testTelegram.answers.getChat = () => {
      throw new Error('TDLib is broken')
    }
    await rejects(loadFeedPosts(), { message: 'TDLib is broken' })
  })

  test('refreshes channels of the account with a session here', async () => {
    let signedIn = await addAccount(
      testAccount({ credentials: null, service: 'telegram' })
    )
    let other = await addAccount(
      testAccount({ credentials: null, service: 'telegram' })
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
    await refreshPosts()
    deepEqual(refreshErrors.get(), [])
    deepEqual(
      new Set((await loadPosts()).map(post => `${post.feedId} ${post.url}`)),
      new Set([
        `${channel} https://t.me/news/2`,
        `${second} https://t.me/second/2`
      ])
    )
    equal((await loadFeed(channel))!.lastOriginId, '2')
    // Every channel is a separate request, so the progress counts it
    equal(refreshStatistics.get().totalFeeds, 4)
    equal(refreshStatistics.get().processedFeeds, 4)
    equal(!!(await loadFeed(channel))!.protected, false)

    // Author forbids or allows copying for all posts of the channel at once
    mockHistory(2, { 0: [message(3, { can_be_saved: false })] })
    await refreshPosts()
    deepEqual(refreshErrors.get(), [])
    equal((await loadFeed(channel))!.protected, true)
    equal((await loadPosts()).filter(i => i.originId === '3').length, 2)

    mockHistory(3, { 0: [message(3)] })
    await refreshPosts()
    equal((await loadFeed(channel))!.protected, false)
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
