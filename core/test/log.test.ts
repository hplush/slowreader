import type { ShadowAction } from '@logux/actions'
import { type Client, type ClientMeta, encryptActions } from '@logux/client'
import type { Action } from '@logux/core'
import { TestClient, type TestServer } from '@logux/server'
import { openDb } from '@nanostores/sql'
import { nodeDriver } from '@nanostores/sql/node'
import { dbReset, RETENTION, signIn } from '@slowreader/api'
import {
  buildTestServer,
  cleanAllTables,
  getServerLogIds
} from '@slowreader/server/test'
import { deepEqual, equal, notEqual, ok } from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addFeed,
  addPost,
  busy,
  deletePost,
  changeFeed,
  client,
  commonMessages,
  downloadingCloudData,
  type Credentials,
  deleteFeed,
  type FeedValue,
  generateCredentials,
  getClient,
  getPostId,
  lastReset,
  loadFeeds,
  loadPosts,
  reportDatabaseError,
  setupEnvironment,
  signUp,
  testFeed,
  testPost,
  useCredentials,
  userId
} from '../index.ts'
import { getTestEnvironment, setBaseTestRoute } from '../test.ts'
import {
  cleanClientTest,
  expectWarning,
  openPage,
  setTestUser,
  waitUntil
} from './utils.ts'

/**
 * Time to let the client finish writing the actions, which the server sent
 * before the disconnect. Closing the database in the middle of the write
 * throws in the SQLite driver.
 */
const SETTLE = 300

async function logEntries(): Promise<[Action, ClientMeta][]> {
  let entries: [Action, ClientMeta][] = []
  await getClient().log.each({ order: 'added' }, (action, meta) => {
    entries.unshift([action, meta])
  })
  return entries
}

async function logTypes(): Promise<string[]> {
  return (await logEntries()).map(entry => entry[0].type)
}

/**
 * Wait until every own action was sent, confirmed by the server
 * and replaced by the shadow.
 */
async function waitSync(): Promise<void> {
  let logux = getClient()
  await waitUntil(() => logux.connected)
  await logux.waitFor('synchronized')
  await waitUntil(async () => {
    let entries = await logEntries()
    return entries.every(entry => entry[0].type === 'shadow')
  })
}

describe('log', () => {
  let server: TestServer | undefined
  let other: TestClient | undefined
  let dir: string
  let storage: Record<string, string>

  beforeEach(() => {
    server = buildTestServer()
    dir = mkdtempSync(join(tmpdir(), 'slowreader-'))
    let environment = getTestEnvironment()
    storage = environment.persistentStore
    // Real time: tombstones are expired by `meta.time`.
    // File database: the client is restarted in the migration tests.
    setupEnvironment({
      ...environment,
      databaseCreator: () => openDb(nodeDriver(join(dir, 'app.sqlite'))),
      server
    })
    setBaseTestRoute({ params: {}, route: 'home' })
  })

  afterEach(async () => {
    // The client is stopped first: actions of the server must not reach it
    // after the database was closed
    client.get()?.destroy()
    await other?.disconnect()
    other = undefined
    await server?.destroy()
    server = undefined
    await setTimeout(SETTLE)
    await cleanClientTest()
    setTestUser(false)
    await cleanAllTables()
    rmSync(dir, { force: true, recursive: true })
  })

  async function restartClient(between?: () => Promise<void>): Promise<void> {
    let user = userId.get()!
    getClient().node.connection.disconnect()
    await setTimeout(SETTLE)
    userId.set(undefined)
    await waitUntil(() => !client.get())
    await setTimeout(SETTLE)
    if (between) await between()
    userId.set(user)
    await waitUntil(() => !!client.get())
    await waitSync()
  }

  /**
   * Another device of the same user, which talks to the server directly.
   */
  async function connectOtherDevice(
    credentials: Credentials
  ): Promise<TestClient> {
    let response = await signIn(
      { password: credentials.password, userId: credentials.userId },
      { fetch: server!.fetch }
    )
    let { session } = await response.json()
    let device = new TestClient(server!, credentials.userId, { token: session })
    encryptActions(device as unknown as Client, credentials.encryptionKey)
    device.log.on('preadd', (action, meta) => {
      if (action.type !== 'logux/processed') {
        meta.reasons.push('test')
        meta.sync = true
      }
    })
    await device.connect()
    other = device
    return device
  }

  async function signUpCloudUser(): Promise<Credentials> {
    let credentials = generateCredentials()
    await signUp(credentials)
    await waitSync()
    return credentials
  }

  test('keeps the log empty in the local mode', async () => {
    setTestUser()

    let feedId = await addFeed(testFeed({ title: 'A' }))
    await changeFeed(feedId, { title: 'B' })
    await deleteFeed(feedId)

    deepEqual(await logTypes(), [])
  })

  test('replaces confirmed actions with shadows', async () => {
    await signUpCloudUser()

    let feedId = await addFeed(testFeed({ title: 'A' }))
    await waitSync()

    let entries = await logEntries()
    equal(entries.length, 1)
    let [action, meta] = entries[0]!
    equal(action.type, 'shadow')
    equal(meta.sync, undefined)
    equal(meta.indexes!.includes(`feeds/${feedId}`), true)
    equal(meta.reasons.includes(`feeds/${feedId}`), true)
    equal(meta.reasons.includes(`feeds/${feedId}/title`), true)
    deepEqual(await getServerLogIds(), [(action as ShadowAction).id])
  })

  test('moves the cell to the last writer and keeps the create', async () => {
    await signUpCloudUser()

    let feedId = await addFeed(testFeed({ title: 'A' }))
    await waitSync()
    await changeFeed(feedId, { title: 'B' })
    await waitSync()

    let entries = await logEntries()
    equal(entries.length, 2)
    // The create keeps the row alive for the new devices, even when every
    // its cell was overwritten
    equal(entries[0]![1].reasons.includes(`feeds/${feedId}`), true)
    equal(entries[0]![1].reasons.includes(`feeds/${feedId}/title`), false)
    deepEqual(entries[1]![1].reasons, [`feeds/${feedId}/title`])
    equal((await getServerLogIds()).length, 2)
  })

  test('cleans the server from the actions without cells', async () => {
    await signUpCloudUser()

    let feedId = await addFeed(testFeed({ title: 'A' }))
    await waitSync()
    let created = await getServerLogIds()

    await deleteFeed(feedId)
    await waitSync()
    await waitUntil(async () => (await getServerLogIds()).length === 1)

    let stored = await getServerLogIds()
    notEqual(stored[0], created[0])

    let entries = await logEntries()
    equal(entries.length, 1)
    equal(entries[0]![0].type, 'shadow')
    deepEqual(entries[0]![1].reasons, ['tombstone'])
  })

  test('restores the tables from themselves on the schema change', async () => {
    await signUpCloudUser()

    let feedId = await addFeed(testFeed({ title: 'A' }))
    await changeFeed(feedId, { title: 'B' })
    await waitSync()
    let before = await loadFeeds()

    // Any change in the tables schema re-creates the database. The schema
    // is compared with the hash inside the database, not with the storage
    let fake = JSON.stringify({ actions: {}, tables: {}, version: 0 })
    // The menu reducer shares the snapshot of the database migration
    storage['logux:reducer:slowreader:menu'] = '0'
    await restartClient(async () => {
      let db = openDb(nodeDriver(join(dir, 'app.sqlite')))
      await db.exec`
        UPDATE "logux_crdt" SET "value" = ${fake} WHERE "key" = 'schema'
      `
      await db.close()
    })
    await waitUntil(async () => (await loadFeeds()).length === 1)

    deepEqual(dropMeta(await loadFeeds()), dropMeta(before))
    let entries = await logEntries()
    deepEqual(
      entries.map(entry => entry[0].type),
      ['shadow', 'shadow']
    )
    let reasons = entries.map(entry => entry[1].reasons)
    equal(
      reasons.some(list => list.includes(`feeds/${feedId}/title`)),
      true
    )
    equal(
      reasons.some(list => list.includes(`feeds/${feedId}`)),
      true
    )

    // The server could get `0/clean` after the restore, so the log is checked
    // when the client finished with the re-sent actions
    await setTimeout(SETTLE)
    await waitSync()
    equal((await getServerLogIds()).length, 2)
  })

  test('cleans the action, which lost every cell', async () => {
    await signUpCloudUser()

    let feedId = await addFeed(testFeed({ title: 'A' }))
    await waitSync()
    await changeFeed(feedId, { title: 'B' })
    let lost = (await logEntries()).find(entry => {
      return entry[0].type === 'feeds/changed'
    })!
    await changeFeed(feedId, { title: 'C' })
    await waitSync()

    // The action, which owns nothing, is removed from the log
    // and from the server without any shadow
    let entries = await logEntries()
    equal(entries.length, 2)
    equal(
      entries.some(entry => entry[1].id === lost[1].id),
      false
    )
    await waitUntil(async () => {
      return !(await getServerLogIds()).includes(lost[1].id)
    })
  })

  test('supports batch actions', async () => {
    await signUpCloudUser()

    let feedIds = await addFeed([testFeed({ title: 'A' }), testFeed()])
    await changeFeed(feedIds, { reading: 'slow' })
    await waitSync()

    let entries = await logEntries()
    equal(entries.length, 2)
    let reasons = entries.map(entry => entry[1].reasons)
    for (let feedId of feedIds) {
      equal(
        reasons.some(list => list.includes(`feeds/${feedId}`)),
        true
      )
      equal(
        reasons.some(list => list.includes(`feeds/${feedId}/reading`)),
        true
      )
    }

    await deleteFeed(feedIds[0]!)
    await deleteFeed(feedIds[1]!)
    await waitSync()
    deepEqual(
      (await logEntries()).map(entry => entry[1].reasons),
      [['tombstone'], ['tombstone']]
    )
  })

  test('ignores actions of unknown tables and verbs', async () => {
    await signUpCloudUser()

    await getClient().log.add(
      { type: 'feeds/refreshed' },
      { reasons: ['test'] }
    )
    await getClient().log.add({ type: 'other/created' }, { reasons: ['test'] })

    deepEqual(
      (await logEntries()).map(entry => entry[1].sync),
      [undefined, undefined]
    )
    await getClient().log.removeReason('test')
    equal((await getServerLogIds()).length, 0)
  })

  test('re-downloads the data on the user request', async () => {
    await signUpCloudUser()
    await addFeed(testFeed({ title: 'A' }))
    await waitSync()
    await waitUntil(() => typeof storage['slowreader:menu'] === 'string')

    let page = openPage({ params: {}, route: 'storage' })
    await page.resetDatabase()

    equal(typeof lastReset.get(), 'object')
    deepEqual(await logTypes(), [])
    // The reducer is not re-created from the log, so the actions of the next
    // download must not be reduced on top of the old menu
    equal(typeof storage['slowreader:menu'], 'undefined')
  })

  test('shows the loader until the download is finished', async () => {
    await signUpCloudUser()
    await addFeed(testFeed({ title: 'A' }))
    await waitSync()

    let page = openPage({ params: {}, route: 'storage' })
    await page.resetDatabase()
    equal(downloadingCloudData.get(), true)

    let labels: string[] = []
    let unbind = busy.listen(value => {
      if (value) labels.push(value.label)
    })

    // The client was destroyed by the reset, so the app restarts it
    let user = userId.get()!
    userId.set(undefined)
    await waitUntil(() => !client.get())
    await setTimeout(SETTLE)
    userId.set(user)
    await waitUntil(() => !!client.get())
    ok(labels.includes(commonMessages.get().waitingConnection))
    await waitUntil(() => labels.includes(commonMessages.get().downloadingData))

    await waitUntil(() => !downloadingCloudData.get())
    equal(busy.get(), false)
    equal((await loadFeeds()).length, 1)
    unbind()
  })

  test('removes the download mark if the database is already filled', async () => {
    await signUpCloudUser()
    await addFeed(testFeed({ title: 'A' }))
    await waitSync()

    // For instance, the app was closed during the download
    downloadingCloudData.set(true)

    let user = userId.get()!
    userId.set(undefined)
    await waitUntil(() => !client.get())
    await setTimeout(SETTLE)
    userId.set(user)
    await waitUntil(() => !!client.get())

    await waitUntil(() => !downloadingCloudData.get())
    await waitUntil(() => busy.get() === false)
    equal((await loadFeeds()).length, 1)
  })

  test('merges the post, which two devices added on their own', async () => {
    let credentials = await signUpCloudUser()
    let device = await connectOtherDevice(credentials)

    let feedId = await addFeed(testFeed({ title: 'A' }))
    let postId = getPostId(feedId, {
      id: 'random',
      originId: 'post-1',
      url: 'https://one.com/1'
    })
    // Both devices were offline and added the post on their own
    await addPost(
      testPost({ feedId, id: postId, originId: 'post-1', title: 'Mine' })
    )
    await device.process(
      {
        fields: {
          feedId,
          originId: 'post-1',
          publishedAt: 1000,
          read: 0,
          reading: 'slow',
          title: 'Theirs'
        },
        id: postId,
        type: 'posts/created'
      },
      // The action of another device must win the last write to be visible
      { time: Date.now() + 10_000 }
    )
    await waitUntil(async () => (await loadPosts())[0]?.title === 'Theirs')

    // The same row ID, so the merge keeps one post instead of two
    let posts = await loadPosts()
    equal(posts.length, 1)
    equal(posts[0]!.id, postId)
  })

  test('deletes the post, which the offline device brought back', async () => {
    let credentials = await signUpCloudUser()
    let device = await connectOtherDevice(credentials)

    let feedId = await addFeed(testFeed({ title: 'A' }))
    let postId = await addPost(testPost({ feedId, originId: 'post-1' }))
    await deletePost(postId)
    await waitUntil(async () => (await loadPosts()).length === 0)

    // The device was offline during the read, so its create is older
    // than the deletion, but comes after it
    await device.process(
      {
        fields: {
          feedId,
          originId: 'post-1',
          publishedAt: 1000,
          read: 0,
          reading: 'slow',
          title: 'Back'
        },
        id: postId,
        type: 'posts/created'
      },
      { time: 1 }
    )

    await waitUntil(async () => (await logTypes()).includes('posts/deleted'))
    await waitUntil(async () => (await loadPosts()).length === 0)
  })

  test('shadows the action of another device right after the apply', async () => {
    let credentials = await signUpCloudUser()
    let device = await connectOtherDevice(credentials)

    await device.process({
      fields: { loader: 'rss', reading: 'fast', title: 'A', url: 'A' },
      id: 'other-1',
      type: 'feeds/created'
    })
    await waitUntil(async () => (await loadFeeds()).length === 1)
    await waitUntil(async () => (await logTypes()).length === 1)

    let [action, meta] = (await logEntries())[0]!
    equal(action.type, 'shadow')
    equal((action as ShadowAction).id, device.log.entries()[0]![1].id)
    equal(meta.reasons.includes('feeds/other-1/title'), true)
  })

  test('forgets the cells, which the late action lost', async () => {
    let credentials = await signUpCloudUser()
    let device = await connectOtherDevice(credentials)

    let feedId = await addFeed(testFeed({ title: 'New' }))
    await waitSync()

    // The action of another device was created before ours, but came later
    await device.process(
      { fields: { title: 'Old' }, id: feedId, type: 'feeds/changed' },
      { time: 1 }
    )

    // The late action owns nothing, so it is removed from the log
    // and from the server
    await waitUntil(async () => (await logTypes()).length === 1)
    equal((await loadFeeds())[0]!.title, 'New')
    await waitUntil(async () => (await getServerLogIds()).length === 1)
  })

  test('merges the shadow when the server re-sends the action', async () => {
    await signUpCloudUser()

    let feedId = await addFeed(testFeed({ title: 'A' }))
    await waitSync()
    let original = (await logEntries())[0]![0] as ShadowAction

    // The server re-sends the actions, which the client did not confirm
    await getClient().log.add(
      { fields: { title: 'A' }, id: feedId, type: 'feeds/created' },
      { id: original.id }
    )
    await waitSync()

    let entries = await logEntries()
    equal(entries.length, 1)
    equal(entries[0]![1].reasons.includes(`feeds/${feedId}/title`), true)
    deepEqual(await getServerLogIds(), [original.id])
  })

  test('drops the body left by the interrupted shadowing', async () => {
    await signUpCloudUser()

    let feedId = await addFeed(testFeed({ title: 'A' }))
    await waitSync()
    let original = (await logEntries())[0]![0] as ShadowAction

    // The tab was closed between adding the shadow and clearing the original.
    // The action was already sent and confirmed, so nothing will apply it
    // or send it again: only the repair on the start can drop the body
    await getClient().log.store.add(
      { fields: { title: 'A' }, id: feedId, type: 'feeds/created' },
      {
        added: 0,
        id: original.id,
        indexes: [`feeds/${feedId}`],
        reasons: [`feeds/${feedId}`],
        sync: true,
        time: Date.now()
      }
    )
    await restartClient()
    await waitUntil(async () => (await logTypes()).length === 1)

    deepEqual(await logTypes(), ['shadow'])
    deepEqual(await getServerLogIds(), [original.id])
  })

  test('expires tombstones', async () => {
    await signUpCloudUser()

    let feedId = await addFeed(testFeed({ title: 'A' }))
    await waitSync()
    // The row was deleted before the retention window
    await getClient().log.add(
      { id: feedId, type: 'feeds/deleted' },
      { time: Date.now() - 2 * RETENTION }
    )
    await waitUntil(async () => (await logTypes()).length === 0)
    await waitUntil(async () => (await getServerLogIds()).length === 0)
  })

  test('re-downloads the data on the server request', async () => {
    await signUpCloudUser()
    await addFeed(testFeed({ title: 'A' }))
    await waitSync()

    // The device was offline longer than the tombstone retention window
    await server!.log.add(dbReset({}), {
      clients: [getClient().clientId]
    })
    await waitUntil(() => !!lastReset.get())
    await waitUntil(async () => (await logTypes()).length === 0)
  })

  test('re-downloads the data when the database file was lost', async () => {
    await signUpCloudUser()
    await addFeed(testFeed({ title: 'A' }))
    await waitSync()

    let user = userId.get()!
    getClient().node.connection.disconnect()
    await setTimeout(SETTLE)
    userId.set(undefined)
    await waitUntil(() => !client.get())
    await setTimeout(SETTLE)

    // The browser dropped the origin’s files, but kept `localStorage`,
    // so the tables are created empty again
    for (let file of ['app.sqlite', 'app.sqlite-shm', 'app.sqlite-wal']) {
      rmSync(join(dir, file), { force: true })
    }

    userId.set(user)
    await waitUntil(() => !!client.get())
    await waitUntil(() => !!lastReset.get())
    equal(lastReset.get()!.reason, 'lost-database')
  })

  test('re-downloads the data on the database error', async () => {
    await signUpCloudUser()
    await addFeed(testFeed({ title: 'A' }))
    await waitSync()

    let error = new Error('Broken database')
    expectWarning(() => {
      reportDatabaseError(error)
    }, [error])

    await waitUntil(() => !!lastReset.get())
    await waitUntil(async () => (await logTypes()).length === 0)
  })

  test('uploads local data on the sign up', async () => {
    let credentials = generateCredentials()
    useCredentials(credentials)
    let feedId = await addFeed(testFeed({ title: 'A' }))
    await waitUntil(async () => (await logTypes()).length === 0)

    await signUp(credentials)
    await waitSync()

    deepEqual(await logTypes(), ['shadow'])
    equal((await getServerLogIds()).length, 1)
    let entries = await logEntries()
    equal(entries[0]![1].reasons.includes(`feeds/${feedId}`), true)
    deepEqual((await loadFeeds())[0]!.title, 'A')
  })
})

function dropMeta(feeds: FeedValue[]): object[] {
  return feeds.map(feed => {
    let clean: Record<string, unknown> = {}
    for (let key in feed) {
      if (!key.startsWith('updatedAt_')) {
        clean[key] = feed[key as keyof FeedValue]
      }
    }
    return clean
  })
}
