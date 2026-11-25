import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addFeed,
  addPost,
  cacheImages,
  cacheMediaOnRequest,
  cacheMediaReading,
  cacheVideos,
  canDetectNetwork,
  changePost,
  chooseMediaCopy,
  deleteFeed,
  clearMediaCache,
  deletePost,
  extensionState,
  getClient,
  getDatabase,
  getEnvironment,
  HTTPStatusError,
  isMediaCached,
  loadPost,
  mediaErrors,
  mediaProgress,
  mediaStatistics,
  refreshPosts,
  refreshStatus,
  refreshTotalProgress,
  saveDataMode,
  setupEnvironment,
  signOut,
  stopMediaCache,
  stopRefreshing,
  syncMediaCache,
  testFeed,
  testPost
} from '../index.ts'
import {
  checkAndRemoveRequestMock,
  cleanClient,
  expectRequest,
  expectWarning,
  getTestEnvironment,
  mockRequest,
  setTestNetwork,
  startClient,
  waitUntil
} from './utils.ts'

describe('media cache', () => {
  beforeEach(() => {
    mockRequest()
    startClient()
  })

  afterEach(async () => {
    cacheMediaReading.set('all')
    cacheImages.set('always')
    cacheVideos.set('never')
    saveDataMode.set('auto')
    await cleanClient()
    checkAndRemoveRequestMock()
  })

  function cached(): Promise<string[]> {
    return getEnvironment()
      .mediaCache.keys()
      .then(keys => keys.toSorted())
  }

  test('downloads media of posts', async () => {
    await addFeed(testFeed({ avatar: 'https://feed.com/avatar.png' }))
    await addPost(
      testPost({
        author: { avatar: 'https://author.com/a.png', title: 'Author' },
        media: [
          { type: 'image', url: 'https://img.com/1.jpg' },
          {
            poster: 'https://img.com/poster.jpg',
            sources: [
              {
                type: 'application/vnd.apple.mpegurl',
                url: 'https://v.com/l.m3u8'
              }
            ],
            type: 'video',
            url: 'https://v.com/1.mp4'
          }
        ],
        preview: { image: 'https://preview.com/p.png', url: 'https://a.com/' },
        quoted: {
          media: [{ type: 'image', url: 'https://img.com/quote.jpg' }],
          missing: false
        },
        sortedAt: 2000
      })
    )
    expectRequest('https://feed.com/avatar.png').andRespond(200, 'a')
    expectRequest('https://author.com/a.png').andRespond(200, 'bb')
    expectRequest('https://preview.com/p.png').andRespond(200, 'c')
    let image = expectRequest('https://img.com/1.jpg')
    image.andRespond(200, '1234')
    expectRequest('https://img.com/poster.jpg').andRespond(200, 'p')
    expectRequest('https://img.com/quote.jpg').andRespond(200, 'qq')
    await syncMediaCache()

    deepEqual(await cached(), [
      'https://author.com/a.png',
      'https://feed.com/avatar.png',
      'https://img.com/1.jpg',
      'https://img.com/poster.jpg',
      'https://img.com/quote.jpg',
      'https://preview.com/p.png'
    ])
    deepEqual(mediaStatistics.get(), { done: 6, failed: 0, total: 6 })
    equal(mediaProgress.get(), 1)
    equal(await getEnvironment().mediaCache.size(), 11)
    deepEqual(image.sent().headers, { Accept: 'image/*' })
  })

  test('downloads videos without playlists', async () => {
    cacheVideos.set('always')
    await addPost(
      testPost({
        media: [
          {
            sources: [
              {
                type: 'application/vnd.apple.mpegurl',
                url: 'https://v.com/l.m3u8'
              },
              { type: 'video/webm', url: 'https://v.com/1.webm' }
            ],
            type: 'video',
            url: 'https://v.com/1.mp4'
          },
          { type: 'video', url: 'https://v.com/only.m3u8' },
          { type: 'audio', url: 'https://v.com/1.mp3' }
        ]
      })
    )
    let video = expectRequest('https://v.com/1.mp4')
    video.andRespond(200, 'v')
    expectRequest('https://v.com/1.webm').andRespond(200, 'w')
    await syncMediaCache()
    deepEqual(video.sent().headers, { Accept: 'video/*' })
    deepEqual(await cached(), ['https://v.com/1.mp4', 'https://v.com/1.webm'])
  })

  test('deletes media of deleted posts', async () => {
    let shared = { avatar: 'https://author.com/a.png', title: 'Author' }
    let read = await addPost(
      testPost({
        author: shared,
        media: [{ type: 'image', url: 'https://img.com/1.jpg' }],
        sortedAt: 3000
      })
    )
    let deleted = await addPost(
      testPost({
        media: [{ type: 'image', url: 'https://img.com/2.jpg' }],
        sortedAt: 2000
      })
    )
    await addPost(testPost({ author: shared }))
    expectRequest('https://author.com/a.png').andRespond(200, 'a')
    expectRequest('https://img.com/1.jpg').andRespond(200, '1')
    expectRequest('https://img.com/2.jpg').andRespond(200, '2')
    await syncMediaCache()

    await changePost(read, { read: 1 })
    await syncMediaCache()
    deepEqual(await cached(), [
      'https://author.com/a.png',
      'https://img.com/1.jpg',
      'https://img.com/2.jpg'
    ])

    await deletePost([read, deleted])
    deepEqual(await cached(), ['https://author.com/a.png'])
    await syncMediaCache()
    deepEqual(await cached(), ['https://author.com/a.png'])
    deepEqual(mediaStatistics.get(), { done: 3, failed: 0, total: 3 })

    cacheImages.set('never')
    await syncMediaCache()
    deepEqual(await cached(), [])
  })

  test('deletes media of posts in the history', async () => {
    let post = await addPost(
      testPost({ media: [{ type: 'image', url: 'https://img.com/1.jpg' }] })
    )
    expectRequest('https://img.com/1.jpg').andRespond(200, '1')
    await syncMediaCache()
    deepEqual(await cached(), ['https://img.com/1.jpg'])

    await changePost(post, { read: 2 })
    deepEqual(await cached(), [])
    await syncMediaCache()
    deepEqual(await cached(), [])

    await changePost(post, { read: 0 })
    expectRequest('https://img.com/1.jpg').andRespond(200, '1')
    await syncMediaCache()
    deepEqual(await cached(), ['https://img.com/1.jpg'])
  })

  test('deletes media of posts deleted on another device', async () => {
    let id = await addPost(
      testPost({ media: [{ type: 'image', url: 'https://img.com/1.jpg' }] })
    )
    expectRequest('https://img.com/1.jpg').andRespond(200, '1')
    await syncMediaCache()

    await getClient().log.add(
      { id, type: 'posts/deleted' },
      { id: '1 10:other:1 0', reasons: ['test'], time: Date.now() }
    )
    await waitUntil(async () => (await cached()).length === 0)
  })

  test('downloads media of posts from another device', async () => {
    expectRequest('https://img.com/1.jpg').andRespond(200, '1')
    await getClient().log.add(
      {
        fields: {
          media: [{ type: 'image', url: 'https://img.com/1.jpg' }],
          publishedAt: 1000,
          read: 0,
          reading: 'slow',
          sortedAt: 1000
        },
        id: 'other-post',
        type: 'posts/created'
      },
      { id: '1 10:other:1 0', reasons: ['test'], time: Date.now() }
    )
    await waitUntil(async () => (await cached()).length === 1)
  })

  test('warns on broken cache for posts from another device', async () => {
    let error = new Error('Cache is broken')
    let checked = false
    setupEnvironment({
      ...getTestEnvironment(),
      mediaCache: {
        ...getTestEnvironment().mediaCache,
        keys() {
          checked = true
          return Promise.reject(error)
        }
      }
    })
    await expectWarning(async () => {
      await getClient().log.add(
        {
          fields: {
            media: [{ type: 'image', url: 'https://img.com/1.jpg' }],
            publishedAt: 1000,
            read: 0,
            reading: 'slow',
            sortedAt: 1000
          },
          id: 'broken-post',
          type: 'posts/created'
        },
        { id: '2 10:other:1 0', reasons: ['test'], time: Date.now() }
      )
      await waitUntil(() => checked)
    }, [error])
  })

  test('ignores posts from another device without saving or network', async () => {
    await getEnvironment().mediaCache.put(
      'https://old.com/a.png',
      new Response('a')
    )
    function addRemotePost(id: string): Promise<unknown> {
      return getClient().log.add(
        {
          fields: {
            media: [{ type: 'image', url: `https://img.com/${id}.jpg` }],
            publishedAt: 1000,
            read: 0,
            reading: 'slow',
            sortedAt: 1000
          },
          id,
          type: 'posts/created'
        },
        { id: `1 10:other:${id} 0`, reasons: ['test'], time: Date.now() }
      )
    }

    cacheMediaReading.set('none')
    await addRemotePost('1')
    await setTimeout(1100)
    deepEqual(await cached(), ['https://old.com/a.png'])

    cacheMediaReading.set('all')
    saveDataMode.set('on')
    await addRemotePost('2')
    await setTimeout(1100)
    deepEqual(await cached(), ['https://old.com/a.png'])
  })

  test('deletes media with the feed', async () => {
    let feedId = await addFeed(testFeed())
    await addPost(
      testPost({
        feedId,
        media: [{ type: 'image', url: 'https://img.com/1.jpg' }]
      })
    )
    expectRequest('https://img.com/1.jpg').andRespond(200, '1')
    await syncMediaCache()

    await deleteFeed(feedId)
    deepEqual(await cached(), [])
  })

  test('downloads media only of useful posts', async () => {
    await addFeed(
      testFeed({ avatar: 'https://feed.com/fast.png', reading: 'fast' })
    )
    await addFeed(
      testFeed({ avatar: 'https://feed.com/slow.png', reading: 'slow' })
    )
    await addPost(
      testPost({
        media: [{ type: 'image', url: 'https://img.com/fast.jpg' }],
        reading: 'fast'
      })
    )
    await addPost(
      testPost({
        media: [{ type: 'image', url: 'https://img.com/slow.jpg' }],
        reading: 'slow'
      })
    )
    expectRequest('https://feed.com/fast.png').andRespond(200, '1')
    expectRequest('https://feed.com/slow.png').andRespond(200, '1')
    expectRequest('https://img.com/fast.jpg').andRespond(200, '1')
    expectRequest('https://img.com/slow.jpg').andRespond(200, '1')
    await syncMediaCache()

    cacheMediaReading.set('slow')
    await syncMediaCache()
    deepEqual(await cached(), [
      'https://feed.com/slow.png',
      'https://img.com/slow.jpg'
    ])

    cacheMediaReading.set('none')
    deepEqual(refreshTotalProgress.get(), { stage: 'onlyPosts', value: 1 })
    await syncMediaCache()
    deepEqual(await cached(), [])
  })

  test('respects network type', async () => {
    setTestNetwork({ saveData: false, type: 'paid' })
    equal(canDetectNetwork(), true)
    await addPost(
      testPost({ media: [{ type: 'image', url: 'https://img.com/1.jpg' }] })
    )

    cacheImages.set('free')
    await syncMediaCache()
    deepEqual(await cached(), [])

    setTestNetwork({ saveData: true, type: 'free' })
    await syncMediaCache()
    deepEqual(await cached(), [])

    setTestNetwork({ saveData: false, type: 'paid' })
    cacheImages.set('always')
    expectRequest('https://img.com/1.jpg').andRespond(200, '1')
    await syncMediaCache()
    deepEqual(await cached(), ['https://img.com/1.jpg'])

    cacheImages.set('free')
    await syncMediaCache()
    deepEqual(await cached(), ['https://img.com/1.jpg'])
  })

  test('does not download media in Save Data mode', async () => {
    saveDataMode.set('on')
    await addPost(
      testPost({ media: [{ type: 'image', url: 'https://img.com/1.jpg' }] })
    )
    await syncMediaCache()
    deepEqual(await cached(), [])
  })

  test('caches media on request', async () => {
    saveDataMode.set('on')
    equal(await isMediaCached('https://img.com/1.jpg'), false)

    let image = expectRequest('https://img.com/1.jpg')
    image.andRespond(200, '1')
    await cacheMediaOnRequest('https://img.com/1.jpg')
    deepEqual(image.sent().headers, { Accept: 'image/*' })
    equal(await isMediaCached('https://img.com/1.jpg'), true)

    let video = expectRequest('https://img.com/1.mp4')
    video.andRespond(200, '1')
    await cacheMediaOnRequest('https://img.com/1.mp4', true)
    deepEqual(video.sent().headers, { Accept: 'video/*' })
    deepEqual(await cached(), [
      'https://img.com/1.jpg',
      'https://img.com/1.mp4'
    ])
  })

  test('chooses the copy of the image for the page', async () => {
    let media = {
      copies: [
        { url: 'https://img.com/1280.jpg', width: 1280 },
        { url: 'https://img.com/800.jpg', width: 800 }
      ],
      url: 'https://img.com/best.jpg'
    }
    equal(await chooseMediaCopy(media, 512), 'https://img.com/800.jpg')
    equal(await chooseMediaCopy(media, 1024), 'https://img.com/1280.jpg')
    equal(await chooseMediaCopy(media, 2048), media.url)
    equal(await chooseMediaCopy({ url: media.url }, 512), media.url)

    expectRequest(media.url).andRespond(200, 'best')
    await cacheMediaOnRequest(media.url)
    equal(await chooseMediaCopy(media, 512), media.url)
  })

  test('falls back to always on unknown network', async () => {
    equal(canDetectNetwork(), false)
    cacheImages.set('free')
    await addPost(
      testPost({ media: [{ type: 'image', url: 'https://img.com/1.jpg' }] })
    )
    expectRequest('https://img.com/1.jpg').andRespond(200, '1')
    await syncMediaCache()
    deepEqual(await cached(), ['https://img.com/1.jpg'])
  })

  test('counts failed downloads', async () => {
    await addPost(
      testPost({
        media: [
          { type: 'image', url: 'https://img.com/1.jpg' },
          { type: 'image', url: 'https://img.com/2.jpg' }
        ]
      })
    )
    expectRequest('https://img.com/1.jpg').andRespond(404)
    expectRequest('https://img.com/2.jpg').andRespond(200, '2')
    await syncMediaCache()
    deepEqual(await cached(), ['https://img.com/2.jpg'])
    deepEqual(mediaStatistics.get(), { done: 1, failed: 1, total: 2 })
    let [error, ...other] = mediaErrors.get()
    equal(other.length, 0)
    equal(error?.type === 'file' && error.url, 'https://img.com/1.jpg')
    equal(HTTPStatusError.is(error?.error, [404]), true)
  })

  test('hides proxy size limit from errors', async t => {
    t.after(() => {
      extensionState.set('missing')
    })
    await addPost(
      testPost({ media: [{ type: 'image', url: 'https://img.com/1.jpg' }] })
    )
    expectRequest('https://img.com/1.jpg').andRespond(413)
    await syncMediaCache()
    deepEqual(mediaStatistics.get(), { done: 0, failed: 1, total: 1 })
    deepEqual(mediaErrors.get(), [])

    extensionState.set('granted')
    await clearMediaCache()
    expectRequest('https://img.com/1.jpg').andRespond(413)
    await syncMediaCache()
    equal(HTTPStatusError.is(mediaErrors.get()[0]?.error, [413]), true)
  })

  test('saves real sizes', async () => {
    setupEnvironment({
      ...getTestEnvironment(),
      mediaCache: {
        ...getTestEnvironment().mediaCache,
        put(url) {
          return Promise.resolve(
            url.endsWith('2.jpg')
              ? { bytes: 5 }
              : { bytes: 10, height: 20, width: 30 }
          )
        }
      }
    })
    let id = await addPost(
      testPost({
        media: [
          { type: 'image', url: 'https://img.com/1.jpg' },
          { type: 'image', url: 'https://img.com/2.jpg' }
        ],
        mediaSizes: [null, { approximate: true, height: 1, width: 2 }],
        quoted: {
          media: [{ type: 'image', url: 'https://img.com/1.jpg' }],
          missing: false
        },
        sortedAt: 3000
      })
    )
    let same = await addPost(
      testPost({
        media: [{ type: 'image', url: 'https://img.com/3.jpg' }],
        mediaSizes: [{ bytes: 10, height: 20, width: 30 }]
      })
    )
    expectRequest('https://img.com/1.jpg').andRespond(200)
    expectRequest('https://img.com/2.jpg').andRespond(200)
    expectRequest('https://img.com/3.jpg').andRespond(200)
    await syncMediaCache()

    let post = await loadPost(id)
    deepEqual(post?.mediaSizes, [
      { bytes: 10, height: 20, width: 30 },
      { bytes: 5, height: 1, width: 2 }
    ])
    deepEqual(post?.quoted?.mediaSizes, [{ bytes: 10, height: 20, width: 30 }])
    deepEqual((await loadPost(same))?.mediaSizes, [
      { bytes: 10, height: 20, width: 30 }
    ])
  })

  test('is a part of refresh', async () => {
    await addPost(
      testPost({
        media: [{ type: 'image', url: 'https://img.com/1.jpg' }],
        reading: 'slow'
      })
    )
    let image = expectRequest('https://img.com/1.jpg').andWait()
    let refreshing = refreshPosts()
    await new Promise(resolve => {
      let unbind = mediaStatistics.listen(stats => {
        if (stats.total > 0) {
          unbind()
          resolve(undefined)
        }
      })
    })
    deepEqual(refreshTotalProgress.get(), { stage: 'media', value: 0 })
    await image(200, '1')
    await refreshing
    deepEqual(refreshTotalProgress.get(), { stage: 'media', value: 1 })
    deepEqual(await cached(), ['https://img.com/1.jpg'])
  })

  test('finishes refresh on broken cache', async () => {
    let error = new Error('Cache is broken')
    setupEnvironment({
      ...getTestEnvironment(),
      mediaCache: {
        ...getTestEnvironment().mediaCache,
        keys() {
          return Promise.reject(error)
        }
      }
    })
    await addPost(
      testPost({
        media: [{ type: 'image', url: 'https://img.com/1.jpg' }],
        reading: 'slow'
      })
    )
    await expectWarning(() => refreshPosts(), [error])
    equal(refreshStatus.get(), 'done')
  })

  test('shows broken file in errors', async () => {
    let error = new Error('Cache is broken')
    setupEnvironment({
      ...getTestEnvironment(),
      mediaCache: {
        ...getTestEnvironment().mediaCache,
        put() {
          return Promise.reject(error)
        }
      }
    })
    await addPost(
      testPost({ media: [{ type: 'image', url: 'https://img.com/1.jpg' }] })
    )
    expectRequest('https://img.com/1.jpg').andRespond(200, '1')
    await syncMediaCache()
    deepEqual(mediaErrors.get(), [
      { error, type: 'file', url: 'https://img.com/1.jpg' }
    ])
  })

  test('stops with refresh', async () => {
    await addPost(
      testPost({
        media: [
          { type: 'image', url: 'https://img.com/1.jpg' },
          { type: 'image', url: 'https://img.com/2.jpg' },
          { type: 'image', url: 'https://img.com/3.jpg' },
          { type: 'image', url: 'https://img.com/4.jpg' },
          { type: 'image', url: 'https://img.com/5.jpg' },
          { type: 'image', url: 'https://img.com/6.jpg' },
          { type: 'image', url: 'https://img.com/7.jpg' }
        ],
        reading: 'slow'
      })
    )
    let waits = [1, 2, 3, 4, 5, 6].map(i => {
      return expectRequest(`https://img.com/${i}.jpg`).andWait()
    })
    let refreshing = refreshPosts()
    await new Promise(resolve => {
      let unbind = mediaStatistics.listen(stats => {
        if (stats.total > 0) {
          unbind()
          resolve(undefined)
        }
      })
    })
    stopRefreshing()
    await refreshing
    equal(waits[0]!.aborted, true)
    deepEqual(await cached(), [])
  })

  test('skips media, which was deleted or saved during the download', async () => {
    let ids: string[] = []
    for (let i of [1, 2, 3, 4, 5, 6, 7, 8]) {
      ids.push(
        await addPost(
          testPost({
            media: [{ type: 'image', url: `https://img.com/${i}.jpg` }],
            sortedAt: 9000 - i * 1000
          })
        )
      )
    }
    let waits = [1, 2, 3, 4, 5, 6].map(i => {
      return expectRequest(`https://img.com/${i}.jpg`).andWait()
    })
    mediaStatistics.set({ done: 0, failed: 0, total: 0 })
    let syncing = syncMediaCache()
    await waitUntil(() => mediaStatistics.get().total === 8)

    await deletePost([ids[0]!, ids[7]!])
    expectRequest('https://img.com/7.jpg').andRespond(200, '7')
    await cacheMediaOnRequest('https://img.com/7.jpg')
    for (let wait of waits) await wait(200, '1')
    await syncing

    deepEqual(await cached(), [
      'https://img.com/2.jpg',
      'https://img.com/3.jpg',
      'https://img.com/4.jpg',
      'https://img.com/5.jpg',
      'https://img.com/6.jpg',
      'https://img.com/7.jpg'
    ])
    deepEqual(mediaStatistics.get(), { done: 6, failed: 0, total: 6 })
  })

  test('downloads only videos without images', async () => {
    cacheImages.set('never')
    cacheVideos.set('always')
    await addPost(
      testPost({
        media: [
          { type: 'image', url: 'https://img.com/1.jpg' },
          {
            poster: 'https://img.com/poster.jpg',
            type: 'video',
            url: 'https://v.com/1.mp4'
          },
          { type: 'image', url: 'not a URL' }
        ]
      })
    )
    expectRequest('https://v.com/1.mp4').andRespond(200, 'v')
    await syncMediaCache()
    deepEqual(await cached(), ['https://v.com/1.mp4'])
  })

  test('retries server errors', async () => {
    await addPost(
      testPost({ media: [{ type: 'image', url: 'https://img.com/1.jpg' }] })
    )
    expectRequest('https://img.com/1.jpg').andRespond(500)
    expectRequest('https://img.com/1.jpg').andRespond(200, '1')
    await syncMediaCache()
    deepEqual(await cached(), ['https://img.com/1.jpg'])
    deepEqual(mediaStatistics.get(), { done: 1, failed: 0, total: 1 })
  })

  test('downloads images of all posts before videos', async () => {
    cacheVideos.set('always')
    await addPost(
      testPost({
        media: [
          { type: 'video', url: 'https://v.com/new.mp4' },
          { type: 'image', url: 'https://img.com/new.jpg' }
        ],
        publishedAt: 2000
      })
    )
    await addPost(
      testPost({
        media: [{ type: 'image', url: 'https://img.com/old.jpg' }],
        publishedAt: 1000
      })
    )
    expectRequest('https://img.com/new.jpg').andRespond(200, '1')
    expectRequest('https://img.com/old.jpg').andRespond(200, '2')
    expectRequest('https://v.com/new.mp4').andRespond(200, '3')
    await syncMediaCache()
    deepEqual(mediaStatistics.get(), { done: 3, failed: 0, total: 3 })
  })

  test('waits with all files, when the proxy asks for it', async () => {
    await addPost(
      testPost({
        media: [
          { type: 'image', url: 'https://img.com/1.jpg' },
          { type: 'image', url: 'https://img.com/2.jpg' }
        ]
      })
    )
    let wait = { 'X-Slowreader-Wait': '1' }
    expectRequest('https://img.com/1.jpg').andRespond(
      429,
      '',
      'text/plain',
      wait
    )
    expectRequest('https://img.com/2.jpg').andRespond(
      429,
      '',
      'text/plain',
      wait
    )
    expectRequest('https://img.com/2.jpg').andRespond(200, '2')
    expectRequest('https://img.com/1.jpg').andRespond(200, '1')
    let started = Date.now()
    // One warning for all files to find the reason of a slow refresh
    await expectWarning(
      () => syncMediaCache(),
      [new HTTPStatusError(429, 'https://img.com/1.jpg', '', new Headers())]
    )
    equal(Date.now() - started >= 1000, true)
    deepEqual(mediaStatistics.get(), { done: 2, failed: 0, total: 2 })
    deepEqual(mediaErrors.get(), [])

    await addPost(
      testPost({ media: [{ type: 'image', url: 'https://img.com/3.jpg' }] })
    )
    expectRequest('https://img.com/3.jpg').andRespond(429, '', 'text/plain', {
      'X-Slowreader-Wait': '60'
    })
    await expectWarning(async () => {
      let syncing = syncMediaCache()
      await waitUntil(() => mediaStatistics.get().total === 1)
      await setTimeout(50)
      stopMediaCache()
      await syncing
    }, [new HTTPStatusError(429, 'https://img.com/3.jpg', '', new Headers())])
    deepEqual(await cached(), [
      'https://img.com/1.jpg',
      'https://img.com/2.jpg'
    ])
  })

  test('stops on full storage', async () => {
    setupEnvironment({
      ...getTestEnvironment(),
      mediaCache: {
        ...getTestEnvironment().mediaCache,
        put() {
          return Promise.reject(new DOMException('', 'QuotaExceededError'))
        }
      }
    })
    await addPost(
      testPost({
        media: [1, 2, 3, 4, 5, 6, 7, 8].map(i => ({
          type: 'image',
          url: `https://img.com/${i}.jpg`
        }))
      })
    )
    for (let i of [1, 2, 3, 4, 5, 6]) {
      expectRequest(`https://img.com/${i}.jpg`).andRespond(200, '1')
    }
    await syncMediaCache()
    deepEqual(mediaStatistics.get(), { done: 0, failed: 6, total: 8 })
    deepEqual(
      mediaErrors.get().map(i => i.type),
      ['quota']
    )
  })

  test('parses every post once', async () => {
    let id = await addPost(
      testPost({ media: [{ type: 'image', url: 'https://img.com/1.jpg' }] })
    )
    expectRequest('https://img.com/1.jpg').andRespond(200, '1')
    await syncMediaCache()

    let media = JSON.stringify([
      { type: 'image', url: 'https://img.com/2.jpg' }
    ])
    await getDatabase().exec`
      UPDATE "posts" SET "media" = ${media} WHERE "id" = ${id}
    `
    await syncMediaCache()
    deepEqual(await cached(), ['https://img.com/1.jpg'])
  })

  test('parses changed media again', async () => {
    let id = await addPost(
      testPost({ media: [{ type: 'image', url: 'https://img.com/1.jpg' }] })
    )
    expectRequest('https://img.com/1.jpg').andRespond(200, '1')
    await syncMediaCache()

    await changePost(id, {
      media: [{ type: 'image', url: 'https://img.com/2.jpg' }]
    })
    expectRequest('https://img.com/2.jpg').andRespond(200, '2')
    await syncMediaCache()
    deepEqual(await cached(), ['https://img.com/2.jpg'])
  })

  test('downloads media again after cleaning', async () => {
    await addPost(
      testPost({ media: [{ type: 'image', url: 'https://img.com/1.jpg' }] })
    )
    expectRequest('https://img.com/1.jpg').andRespond(200, '1')
    await syncMediaCache()
    await clearMediaCache()
    deepEqual(await cached(), [])

    expectRequest('https://img.com/1.jpg').andRespond(200, '1')
    await syncMediaCache()
    deepEqual(await cached(), ['https://img.com/1.jpg'])
  })

  test('clears cache on sign out', async () => {
    await addPost(
      testPost({ media: [{ type: 'image', url: 'https://img.com/1.jpg' }] })
    )
    expectRequest('https://img.com/1.jpg').andRespond(200, '1')
    await syncMediaCache()
    await signOut()
    deepEqual(await cached(), [])
  })
})
