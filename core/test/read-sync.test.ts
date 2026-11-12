import { deepEqual, equal, rejects } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  addAccount,
  addFeed,
  addPost,
  changeRead,
  deleteFeed,
  deletePostsReadInService,
  deviceSessions,
  loadPosts,
  readPositions,
  refreshPosts,
  sendReadPositions,
  type TelegramObject,
  testAccount,
  testFeed,
  testPost
} from '../index.ts'
import { telegramApp } from '../loader/telegram.ts'
import {
  checkAndRemoveRequestMock,
  cleanClient,
  expectWarning,
  mockRequest,
  startClient,
  testTelegram,
  testTelegramCreator
} from './utils.ts'

const STEP = 1048576

describe('read sync', () => {
  let accountId: string
  let feedId: string

  function mockReadPosition(post: number): void {
    testTelegram.answers.getChat = {
      '@type': 'chat',
      'last_read_inbox_message_id': post * STEP,
      'title': 'News'
    }
  }

  function getViews(): TelegramObject[] {
    return testTelegram.requests.filter(i => i['@type'] === 'viewMessages')
  }

  async function addPosts(source: string, count: number): Promise<string[]> {
    let ids: string[] = []
    for (let i = 1; i <= count; i++) {
      ids.push(
        await addPost(
          testPost({
            feedId: source,
            originId: String(i),
            publishedAt: 1000 + i,
            // Refresh deletes old Fun posts
            reading: 'slow',
            sortedAt: 1000 + i
          })
        )
      )
    }
    return ids
  }

  async function getSaved(): Promise<string[]> {
    return (await loadPosts())
      .map(post => `${post.feedId} ${post.originId}`)
      .toSorted((a, b) => a.localeCompare(b))
  }

  beforeEach(async () => {
    startClient({ telegramCreator: testTelegramCreator })
    mockRequest()
    telegramApp.set({ apiHash: 'hash', apiId: 1 })
    accountId = await addAccount(
      testAccount({ credentials: null, service: 'telegram' })
    )
    deviceSessions.set({ [accountId]: { device: 'name', service: 'telegram' } })
    feedId = await addFeed(
      testFeed({
        accountId,
        loader: 'telegram',
        loaderData: '{"id":"-1001"}',
        url: 'https://t.me/news'
      })
    )
    mockReadPosition(0)
    testTelegram.answers.viewMessages = { '@type': 'ok' }
  })

  afterEach(async () => {
    await cleanClient()
    telegramApp.set(undefined)
    deviceSessions.set({})
    readPositions.set({})
    checkAndRemoveRequestMock()
  })

  test('tells the service the newest post without unread posts under it', async () => {
    let [first, second, third] = await addPosts(feedId, 3)

    await changeRead([third!], true)
    deepEqual(readPositions.get(), {})

    await changeRead([first!], true)
    deepEqual(readPositions.get(), {
      [feedId]: { postOriginId: '1', sortedAt: 1001 }
    })
    await sendReadPositions()
    deepEqual(getViews(), [
      {
        '@type': 'viewMessages',
        'chat_id': -1001,
        'force_read': true,
        'message_ids': [STEP]
      }
    ])
    deepEqual(readPositions.get(), {})

    await changeRead([second!], true)
    deepEqual(readPositions.get(), {
      [feedId]: { postOriginId: '3', sortedAt: 1003 }
    })
    await changeRead([second!], false)
    await changeRead([second!], true)
    deepEqual(Object.keys(readPositions.get()), [feedId])

    // User read these posts in Telegram too
    mockReadPosition(3)
    await sendReadPositions()
    equal(getViews().length, 1)
    deepEqual(readPositions.get(), {})
  })

  test('keeps the position, when it can not be sent', async () => {
    let [first] = await addPosts(feedId, 2)
    await changeRead([first!], true)
    let position = { [feedId]: { postOriginId: '1', sortedAt: 1001 } }

    testTelegram.answers.viewMessages = {
      '@type': 'error',
      'code': 500,
      'message': 'Offline'
    }
    await sendReadPositions()
    deepEqual(readPositions.get(), position)

    testTelegram.answers.viewMessages = () => {
      throw new Error('TDLib is broken')
    }
    await expectWarning(
      () => sendReadPositions(),
      [new Error('TDLib is broken')]
    )
    deepEqual(readPositions.get(), position)

    deviceSessions.set({})
    await sendReadPositions()
    deepEqual(readPositions.get(), position)
    deviceSessions.set({ [accountId]: { device: 'name', service: 'telegram' } })

    // User read the next post during the request
    testTelegram.answers.viewMessages = () => {
      readPositions.set({ [feedId]: { postOriginId: '2', sortedAt: 1002 } })
      return { '@type': 'ok' }
    }
    await sendReadPositions()
    deepEqual(readPositions.get(), {
      [feedId]: { postOriginId: '2', sortedAt: 1002 }
    })

    await deleteFeed(feedId)
    await sendReadPositions()
    deepEqual(readPositions.get(), {})
  })

  test('ignores posts of other feeds', async () => {
    let rss = await addFeed(testFeed())
    let mastodon = await addFeed(
      testFeed({ accountId: await addAccount(testAccount()) })
    )
    await changeRead(
      [...(await addPosts(rss, 1)), ...(await addPosts(mastodon, 1))],
      true
    )
    deepEqual(readPositions.get(), {})
    await sendReadPositions()
    deepEqual(testTelegram.requests, [])
  })

  test('deletes posts, which user read in the service', async () => {
    let rss = await addFeed(testFeed())
    await addPosts(feedId, 3)
    await addPosts(rss, 1)

    mockReadPosition(2)
    await deletePostsReadInService()
    deepEqual(await getSaved(), [`${feedId} 3`, `${rss} 1`])
    deepEqual(readPositions.get(), {})

    testTelegram.answers.getChat = {
      '@type': 'error',
      'code': 400,
      'message': 'Chat not found'
    }
    testTelegram.answers.loadChats = {
      '@type': 'error',
      'code': 404,
      'message': 'Not Found'
    }
    await deletePostsReadInService()
    deepEqual(await getSaved(), [`${feedId} 3`, `${rss} 1`])

    testTelegram.answers.getChat = () => {
      throw new Error('TDLib is broken')
    }
    await rejects(deletePostsReadInService(), {
      message: 'TDLib is broken'
    })

    deviceSessions.set({})
    await deletePostsReadInService()
  })

  test('syncs read position on refresh', async () => {
    let [first] = await addPosts(feedId, 3)
    await changeRead([first!], true)
    mockReadPosition(2)
    testTelegram.answers.getChatHistory = {
      '@type': 'messages',
      'messages': []
    }
    await refreshPosts()
    deepEqual(readPositions.get(), {})
    // The first post was read here, the second one in Telegram
    deepEqual(await getSaved(), [`${feedId} 1`, `${feedId} 3`])

    testTelegram.answers.getChat = () => {
      throw new Error('TDLib is broken')
    }
    await expectWarning(
      () => refreshPosts(),
      [new Error('TDLib is broken'), new Error('TDLib is broken')]
    )
  })
})
