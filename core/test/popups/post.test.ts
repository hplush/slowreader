import { restoreAll, spyOn } from 'nanospy'
import { deepEqual, equal, match } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addFeed,
  addPost,
  closeLastPopup,
  commonMessages,
  deletePost,
  formatDuration,
  formatPublishedAt,
  GENERAL_CATEGORY,
  HTTPStatusError,
  i18nFormat,
  loaders,
  loadPost,
  loadThreadPosts,
  openedPopups,
  type OriginPost,
  postMessages,
  type PostValue,
  testFeed,
  testPost,
  waitLoading
} from '../../index.ts'
import { canOpenPostUrl, getPostPopupParam } from '../../popups/post.ts'
import {
  checkAndRemoveRequestMock,
  checkLoadedPopup,
  cleanClient,
  startClient,
  expectRequest,
  expectWarning,
  getPopup,
  mockRequest,
  openTestPopup,
  openRoute
} from '../utils.ts'

describe('post popup', () => {
  beforeEach(() => {
    startClient()
  })

  afterEach(async () => {
    await cleanClient()
    restoreAll()
  })

  test('opens saved post', async () => {
    let feed = await addFeed(testFeed({ categoryId: GENERAL_CATEGORY }))
    let id1 = await addPost(testPost({ feedId: feed }))
    let id2 = await addPost(testPost({ feedId: feed, publishedAt: undefined }))

    let popup1 = openTestPopup(
      'post',
      getPostPopupParam({ feedId: feed, id: id1 })
    )
    equal(openedPopups.get().length, 1)
    equal(openedPopups.get()[0], popup1)
    equal(popup1.name, 'post')
    equal(popup1.loading.get(), true)

    await waitLoading(popup1.loading)
    equal((checkLoadedPopup(popup1).post.get() as PostValue).id, id1)
    match(checkLoadedPopup(popup1).publishedAt.get()!, /1\/1\/70/)
    equal(checkLoadedPopup(popup1).feed!.get().id, feed)
    equal(checkLoadedPopup(popup1).read, undefined)

    let popup2 = openTestPopup(
      'post',
      getPostPopupParam({ feedId: feed, id: id1 })
    )
    equal(openedPopups.get().length, 2)
    equal(popup1.loading.get(), false)
    equal(popup2.loading.get(), true)

    await waitLoading(popup2.loading)
    equal(popup1.loading.get(), false)
    equal(popup2.loading.get(), false)

    openRoute({
      hash:
        `post=${getPostPopupParam({ feedId: feed, id: id2 })},` +
        `post=${getPostPopupParam({ feedId: feed, id: id1 })}`,
      params: {},
      route: 'fast'
    })
    let popup3 = getPopup('post', 0)
    let popup4 = getPopup('post', 1)
    equal(popup3.loading.get(), true)
    equal(popup4.loading.get(), false)

    await waitLoading(popup3.loading)
    equal((checkLoadedPopup(popup3).post.get() as PostValue).id, id2)
    equal(checkLoadedPopup(popup3).publishedAt.get(), undefined)

    closeLastPopup()
    equal(openedPopups.get().length, 1)

    closeLastPopup()
    equal(openedPopups.get().length, 0)

    let popup5 = openTestPopup('post', 'id:unknown')
    equal(popup5.loading.get(), true)

    await waitLoading(popup5.loading)
    equal(popup5.notFound, true)
  })

  test('read saved post', async () => {
    let feed = await addFeed(testFeed({ categoryId: GENERAL_CATEGORY }))
    let id1 = await addPost(testPost({ feedId: feed }))
    let id2 = await addPost(testPost({ feedId: feed }))

    let popup = openTestPopup(
      'post',
      getPostPopupParam({ feedId: feed, id: id1 }, true)
    )
    await waitLoading(popup.loading)
    equal((await loadPost(id1))!.read, false)
    equal((await loadPost(id2))!.read, false)

    checkLoadedPopup(popup).read!.set(true)
    await setTimeout(1)
    equal((await loadPost(id1))!.read, true)
    equal((await loadPost(id2))!.read, false)

    checkLoadedPopup(popup).read!.set(false)
    await setTimeout(1)
    equal((await loadPost(id1))!.read, false)
    equal((await loadPost(id2))!.read, false)
  })

  test('opens saved post by URL', async () => {
    let mastodon = loaders.mastodon as Required<typeof loaders.mastodon>
    let url = 'https://mastodon.social/@jane/1'
    let byUrl = spyOn(mastodon, 'getPostByUrl', () =>
      Promise.resolve({ id: url, originId: '1', title: 'Network', url })
    )
    spyOn(mastodon, 'getThreadAncestors', () => Promise.resolve([]))
    spyOn(mastodon, 'getThreadDescendants', () => Promise.resolve([]))
    let feed = await addFeed(testFeed({ categoryId: GENERAL_CATEGORY }))
    let id = await addPost(testPost({ feedId: feed, title: 'Saved', url }))
    let rss = await addPost(
      testPost({ feedId: feed, url: 'https://example.com/1' })
    )

    equal(getPostPopupParam({ feedId: feed, id, url }), url)
    equal(getPostPopupParam({ feedId: feed, id, url }, true), `read:${url}`)
    equal(
      getPostPopupParam({
        feedId: feed,
        id: rss,
        url: 'https://example.com/1'
      }),
      `id:${rss}`
    )
    equal(getPostPopupParam({ feedId: feed, id: rss }, true), `read:${rss}`)

    let saved = openTestPopup('post', `read:${url}`)
    await waitLoading(saved.loading)
    equal(byUrl.calls.length, 0)
    equal(checkLoadedPopup(saved).post.get().title, 'Saved')
    equal(checkLoadedPopup(saved).feed!.get().id, feed)
    checkLoadedPopup(saved).read!.set(true)
    await setTimeout(1)
    equal((await loadPost(id))!.read, true)
    closeLastPopup()

    await deletePost(id)
    let deleted = openTestPopup('post', `read:${url}`)
    await waitLoading(deleted.loading)
    equal(byUrl.calls.length, 1)
    equal(checkLoadedPopup(deleted).post.get().title, 'Network')
    equal(checkLoadedPopup(deleted).read, undefined)
  })

  test('opens candidate post', async () => {
    let post: OriginPost = { id: 'post', originId: 'id', title: 'test' }
    let data = getPostPopupParam(post)

    let popup = openTestPopup('post', data)
    await waitLoading(popup.loading)
    deepEqual(checkLoadedPopup(popup).post.get(), post)
    deepEqual(checkLoadedPopup(popup).read, undefined)
    equal(checkLoadedPopup(popup).feed, undefined)

    let broken1 = openTestPopup('post', 'data:aaa')
    await waitLoading(broken1.loading)
    equal(broken1.notFound, true)

    let broken2 = openTestPopup('post', 'aaa')
    await waitLoading(broken2.loading)
    equal(broken2.notFound, true)
  })

  test('opens thread', async () => {
    let feed = await addFeed(testFeed({ categoryId: GENERAL_CATEGORY }))
    let start = await addPost(
      testPost({ feedId: feed, originId: 's', threadId: 's' })
    )
    await addPost(
      testPost({
        feedId: feed,
        merged: true,
        originId: 'p',
        publishedAt: 2000,
        threadId: 's'
      })
    )
    let popup = openTestPopup('post', `id:${start}`)
    await waitLoading(popup.loading)
    deepEqual(
      checkLoadedPopup(popup)
        .thread.get()
        .map(post => [
          post.originId,
          post.publishedAtText,
          post.afterFirstText
        ]),
      [
        [
          'p',
          formatPublishedAt(i18nFormat.get(), 2000),
          postMessages.get().afterFirst({
            time: formatDuration(i18nFormat.get(), 1000)
          })
        ]
      ]
    )
  })

  test('loads new parts of opened thread', async () => {
    // Spy needs the optional method to be required
    let bluesky = loaders.bluesky as Required<typeof loaders.bluesky>
    let feed = await addFeed(
      testFeed({ categoryId: GENERAL_CATEGORY, loader: 'bluesky' })
    )
    let start = await addPost(
      testPost({
        feedId: feed,
        originId: 's',
        publishedAt: 3000,
        read: true,
        threadId: 's'
      })
    )
    await addPost(
      testPost({
        feedId: feed,
        merged: true,
        originId: 'p',
        publishedAt: 2000,
        threadId: 's'
      })
    )
    let descendants = spyOn(bluesky, 'getThreadDescendants', () =>
      Promise.resolve([
        { originId: 'p', publishedAt: 2000 },
        { originId: 'n', publishedAt: 4000, selfReplyTo: 'p' }
      ])
    )
    let popup = openTestPopup('post', `id:${start}`)
    await waitLoading(popup.loading)
    let thread = checkLoadedPopup(popup).thread
    deepEqual(
      thread.get().map(post => post.originId),
      ['p']
    )
    await setTimeout(10)
    equal(descendants.calls[0]![2], 'p')
    deepEqual(
      thread.get().map(post => post.originId),
      ['p', 'n']
    )
    deepEqual(
      (await loadThreadPosts(feed, 's')).map(post => [
        post.originId,
        post.merged,
        post.read
      ]),
      [
        ['p', true, false],
        ['s', false, true],
        ['n', true, true]
      ]
    )
    closeLastPopup()

    spyOn(bluesky, 'getThreadDescendants', () =>
      Promise.reject(new Error('Offline'))
    )
    let offline = openTestPopup('post', `id:${start}`)
    await waitLoading(offline.loading)
    await setTimeout(10)
    deepEqual(
      checkLoadedPopup(offline)
        .thread.get()
        .map(post => post.originId),
      ['p', 'n']
    )
  })

  test('shows time of thread parts from the original post of repost', async () => {
    let mastodon = loaders.mastodon as Required<typeof loaders.mastodon>
    spyOn(mastodon, 'getThreadDescendants', () => Promise.resolve([]))
    let feed = await addFeed(
      testFeed({ categoryId: GENERAL_CATEGORY, loader: 'mastodon' })
    )
    let repost = await addPost(
      testPost({
        feedId: feed,
        originId: 'r',
        publishedAt: 1000,
        repostedBy: { title: 'Jane' },
        sortedAt: 9000,
        threadId: 'r'
      })
    )
    await addPost([
      testPost({
        feedId: feed,
        merged: true,
        originId: 'same',
        publishedAt: 1000.342,
        threadId: 'r'
      }),
      testPost({
        feedId: feed,
        merged: true,
        originId: 'p',
        publishedAt: 1060,
        threadId: 'r'
      })
    ])
    let popup = openTestPopup('post', `id:${repost}`)
    await waitLoading(popup.loading)
    deepEqual(
      checkLoadedPopup(popup)
        .thread.get()
        .map(post => post.afterFirstText),
      [
        postMessages.get().rightAfter,
        postMessages.get().afterFirst({
          time: formatDuration(i18nFormat.get(), 60)
        })
      ]
    )
  })

  test('loads thread of saved repost', async () => {
    let mastodon = loaders.mastodon as Required<typeof loaders.mastodon>
    let feed = await addFeed(
      testFeed({ categoryId: GENERAL_CATEGORY, loader: 'mastodon' })
    )
    let bob = { title: 'Bob' }
    let repost = await addPost(
      testPost({
        feedId: feed,
        originId: 'r',
        publishedAt: 3000,
        repostedBy: { title: 'Jane' }
      })
    )
    let reply = await addPost(
      testPost({
        feedId: feed,
        originId: 'q',
        replied: { missing: true },
        repostedBy: { title: 'Jane' }
      })
    )
    let own = await addPost(testPost({ feedId: feed, originId: 'o' }))
    let descendants = spyOn(mastodon, 'getThreadDescendants', () =>
      Promise.resolve([
        { author: bob, originId: 'p1', publishedAt: 1000, selfReplyTo: 'x' },
        { author: bob, originId: 'p2', publishedAt: 2000, selfReplyTo: 'p1' }
      ])
    )

    let popup = openTestPopup('post', `id:${repost}`)
    await waitLoading(popup.loading)
    await setTimeout(10)
    equal(descendants.calls[0]![2], 'r')
    deepEqual(
      checkLoadedPopup(popup)
        .thread.get()
        .map(post => [post.originId, post.afterFirstText]),
      [
        ['p1', undefined],
        ['p2', undefined]
      ]
    )
    deepEqual(
      (await loadThreadPosts(feed, 'r')).map(post => [
        post.originId,
        post.merged,
        post.author?.title
      ]),
      [
        ['p1', true, 'Bob'],
        ['p2', true, 'Bob'],
        ['r', false, undefined]
      ]
    )
    closeLastPopup()

    for (let id of [reply, own]) {
      let other = openTestPopup('post', `id:${id}`)
      await waitLoading(other.loading)
      await setTimeout(10)
      closeLastPopup()
    }
    equal(descendants.calls.length, 1)
  })

  test('opens thread from the feed preview', async () => {
    let popup = openTestPopup(
      'post',
      getPostPopupParam({
        id: '1',
        originId: '1',
        threadParts: [
          { id: '2', originId: '2', publishedAt: 2000 },
          { id: '3', originId: '3' }
        ]
      })
    )
    await waitLoading(popup.loading)
    deepEqual(
      checkLoadedPopup(popup)
        .thread.get()
        .map(post => [post.originId, post.publishedAtText]),
      [
        ['2', formatPublishedAt(i18nFormat.get(), 2000)],
        ['3', undefined]
      ]
    )
  })

  test('loads thread of post opened by URL', async () => {
    let mastodon = loaders.mastodon as Required<typeof loaders.mastodon>
    let url = 'https://mastodon.social/@jane/2'
    let jane = { title: 'Jane' }
    let offline = false
    spyOn(mastodon, 'getPostByUrl', () =>
      Promise.resolve({
        author: jane,
        id: url,
        originId: '2',
        url,
        ...(offline ? {} : { selfReplyTo: '1' })
      })
    )
    let ancestors = spyOn(mastodon, 'getThreadAncestors', () =>
      Promise.resolve([{ originId: '1' }])
    )
    let descendants = spyOn(mastodon, 'getThreadDescendants', () =>
      offline
        ? Promise.reject(new Error('Offline'))
        : Promise.resolve([{ originId: '3', selfReplyTo: '2' }])
    )
    let popup = openTestPopup('post', url)
    await waitLoading(popup.loading)
    await setTimeout(10)
    deepEqual(ancestors.calls[0]!.slice(1), [url, '2'])
    deepEqual(descendants.calls[0]!.slice(1), [url, '2'])
    let loaded = checkLoadedPopup(popup)
    deepEqual(loaded.post.get(), { author: jane, id: '1', originId: '1' })
    deepEqual(
      loaded.thread.get().map(post => [post.originId, post.author?.title]),
      [
        ['2', 'Jane'],
        ['3', 'Jane']
      ]
    )
    closeLastPopup()

    offline = true
    let broken = openTestPopup('post', url)
    await waitLoading(broken.loading)
    await setTimeout(10)
    equal(ancestors.calls.length, 1)
    equal(checkLoadedPopup(broken).post.get().originId, '2')
    deepEqual(checkLoadedPopup(broken).thread.get(), [])
  })

  test('loads thread of preview post', async () => {
    let mastodon = loaders.mastodon as Required<typeof loaders.mastodon>
    let url = 'https://other.social/@bob/1'
    let byUrl = spyOn(mastodon, 'getPostByUrl', () =>
      Promise.resolve({ id: url, originId: '1', url })
    )
    let descendants = spyOn(mastodon, 'getThreadDescendants', () =>
      Promise.resolve([{ originId: '2', selfReplyTo: '1' }])
    )
    let popup = openTestPopup(
      'post',
      getPostPopupParam({
        id: 'r',
        originId: 'r',
        repostedBy: { title: 'Jane' },
        url
      })
    )
    await waitLoading(popup.loading)
    await setTimeout(10)
    deepEqual(descendants.calls[0]!.slice(1), [url, '1'])
    let loaded = checkLoadedPopup(popup)
    equal(loaded.post.get().originId, 'r')
    deepEqual(
      loaded.thread.get().map(post => post.originId),
      ['2']
    )
    closeLastPopup()

    let rss = openTestPopup(
      'post',
      getPostPopupParam({
        id: 'a',
        originId: 'a',
        url: 'https://example.com/a'
      })
    )
    await waitLoading(rss.loading)
    await setTimeout(10)
    equal(byUrl.calls.length, 1)
  })

  test('opens post by URL', async () => {
    equal(canOpenPostUrl('https://mastodon.social/@jane/1'), true)
    equal(canOpenPostUrl('http://mastodon.social/@jane/1'), false)
    equal(canOpenPostUrl('https://example.com/news/1'), false)
    equal(canOpenPostUrl('https:'), false)

    mockRequest()
    expectRequest('https://mastodon.social/api/v1/statuses/1').andRespond(
      200,
      JSON.stringify({
        account: {
          avatar: '',
          display_name: 'Jane',
          id: 'jane',
          url: 'https://mastodon.social/@jane',
          username: 'jane'
        },
        card: null,
        content: '<p>Text</p>',
        created_at: '2026-01-01T00:00:00.000Z',
        edited_at: null,
        id: '1',
        media_attachments: [],
        poll: null,
        reblog: null,
        sensitive: false,
        spoiler_text: '',
        uri: 'https://mastodon.social/users/jane/statuses/1',
        url: 'https://mastodon.social/@jane/1'
      }),
      'application/json'
    )
    expectRequest(
      'https://mastodon.social/api/v1/statuses/1/context'
    ).andRespond(
      200,
      JSON.stringify({ ancestors: [], descendants: [] }),
      'application/json'
    )
    expectRequest('https://mastodon.social/api/v1/statuses/1').andRespond(
      200,
      JSON.stringify({ id: '1', reblog: null }),
      'application/json'
    )
    let popup = openTestPopup('post', 'https://mastodon.social/@jane/1')
    await waitLoading(popup.loading)
    await setTimeout(10)
    deepEqual(checkLoadedPopup(popup).thread.get(), [])
    deepEqual(checkLoadedPopup(popup).post.get(), {
      author: { title: 'Jane', url: 'https://mastodon.social/@jane' },
      full: '<p>Text</p>',
      id: 'https://mastodon.social/@jane/1',
      originId: '1',
      publishedAt: 1767225600,
      url: 'https://mastodon.social/@jane/1'
    })

    let unknown = openTestPopup('post', 'https://example.com/news/1')
    await waitLoading(unknown.loading)
    equal(unknown.notFound, true)

    expectRequest('https://mastodon.social/api/v1/statuses/2').andRespond(404)
    let missing = openTestPopup('post', 'https://mastodon.social/@jane/2')
    await waitLoading(missing.loading)
    equal(missing.notFound, true)

    expectRequest('https://mastodon.social/api/v1/statuses/3').andRespond(500)
    await expectWarning(async () => {
      let broken = openTestPopup('post', 'https://mastodon.social/@jane/3')
      await waitLoading(broken.loading)
      equal(broken.notFound, false)
      equal(broken.error, commonMessages.get().error5xx)
    }, [
      new HTTPStatusError(
        500,
        'https://mastodon.social/api/v1/statuses/3',
        '',
        new Headers()
      )
    ])
    checkAndRemoveRequestMock()
  })
})
