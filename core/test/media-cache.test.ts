import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  addFeed,
  addPost,
  cacheImages,
  cacheVideos,
  canDetectNetwork,
  changePost,
  deletePost,
  getEnvironment,
  loadPost,
  mediaProgress,
  mediaStatistics,
  type NetworkTypeDetector,
  refreshPosts,
  refreshStatus,
  refreshTotalProgress,
  setupEnvironment,
  signOut,
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
  startClient
} from './utils.ts'

describe('media cache', () => {
  beforeEach(() => {
    mockRequest()
    startClient()
  })

  afterEach(async () => {
    cacheImages.set('always')
    cacheVideos.set('never')
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

    await changePost(read, { read: true })
    await syncMediaCache()
    deepEqual(await cached(), [
      'https://author.com/a.png',
      'https://img.com/1.jpg',
      'https://img.com/2.jpg'
    ])

    await deletePost([read, deleted])
    await syncMediaCache()
    deepEqual(await cached(), ['https://author.com/a.png'])
    deepEqual(mediaStatistics.get(), { done: 3, failed: 0, total: 3 })

    cacheImages.set('never')
    await syncMediaCache()
    deepEqual(await cached(), [])
  })

  test('respects network type', async () => {
    let network: ReturnType<NetworkTypeDetector> = {
      saveData: false,
      type: 'paid'
    }
    setupEnvironment({ ...getTestEnvironment(), networkType: () => network })
    equal(canDetectNetwork(), true)
    await addPost(
      testPost({ media: [{ type: 'image', url: 'https://img.com/1.jpg' }] })
    )

    cacheImages.set('free')
    await syncMediaCache()
    deepEqual(await cached(), [])

    network = { saveData: true, type: 'free' }
    await syncMediaCache()
    deepEqual(await cached(), [])

    network = { saveData: false, type: 'paid' }
    cacheImages.set('always')
    expectRequest('https://img.com/1.jpg').andRespond(200, '1')
    await syncMediaCache()
    deepEqual(await cached(), ['https://img.com/1.jpg'])

    cacheImages.set('free')
    await syncMediaCache()
    deepEqual(await cached(), ['https://img.com/1.jpg'])
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
    equal(refreshTotalProgress.get(), 0.5)
    await image(200, '1')
    await refreshing
    equal(refreshTotalProgress.get(), 1)
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

  test('stops with refresh', async () => {
    await addPost(
      testPost({
        media: [
          { type: 'image', url: 'https://img.com/1.jpg' },
          { type: 'image', url: 'https://img.com/2.jpg' },
          { type: 'image', url: 'https://img.com/3.jpg' },
          { type: 'image', url: 'https://img.com/4.jpg' },
          { type: 'image', url: 'https://img.com/5.jpg' }
        ],
        reading: 'slow'
      })
    )
    let waits = [1, 2, 3, 4].map(i => {
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
        media: [1, 2, 3, 4, 5, 6].map(i => ({
          type: 'image',
          url: `https://img.com/${i}.jpg`
        }))
      })
    )
    for (let i of [1, 2, 3, 4]) {
      expectRequest(`https://img.com/${i}.jpg`).andRespond(200, '1')
    }
    await syncMediaCache()
    deepEqual(mediaStatistics.get(), { done: 0, failed: 4, total: 6 })
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
