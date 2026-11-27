import { restoreAll, spyOn } from 'nanospy'
import { keepMount } from 'nanostores'
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
  getTables,
  HTTPStatusError,
  i18nFormat,
  loaders,
  loadPost,
  loadThreadPosts,
  markReadOn,
  moveToLater,
  openedPopups,
  organizeMessages,
  type OriginPost,
  postMessages,
  type PostValue,
  setPostReaction,
  testFeed,
  testPost,
  toPreviewPost,
  waitLoading
} from '../../index.ts'
import {
  canOpenPostUrl,
  getPostPopupParam,
  type PostPopup
} from '../../popups/post.ts'
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
  openRoute,
  setupNodeDom,
  waitUntil
} from '../utils.ts'

setupNodeDom()

describe('post popup', () => {
  beforeEach(() => {
    startClient()
  })

  afterEach(async () => {
    markReadOn.set('open')
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
    match(checkLoadedPopup(popup1).publishedAt.get()!, /Jan 1, 1970/)
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

  test('shows reaction to saved post', async () => {
    let feed = await addFeed(testFeed())
    let id = await addPost(testPost({ feedId: feed }))
    let own = await addPost(testPost({ accountId: 'account', feedId: null }))

    let popup = openTestPopup('post', `id:${id}`)
    await waitLoading(popup.loading)
    let loaded = checkLoadedPopup(popup)
    deepEqual(loaded.reacted, {
      feedId: feed,
      id,
      url: `http://example.com/${id.replace('post-', '')}`
    })
    await waitUntil(() => loaded.reaction.get() === 'open')
    equal((await getTables().reactions.get(id))!.type, 'open')

    await setPostReaction(loaded.reacted, 'like')
    equal(loaded.reaction.get(), 'like')
    await setPostReaction(loaded.reacted, 'dislike')
    equal(loaded.reaction.get(), 'dislike')
    await setPostReaction(loaded.reacted, 'open')
    equal(loaded.reaction.get(), 'open')
    await setPostReaction(loaded.reacted, 'none')
    equal(loaded.reaction.get(), 'none')

    let again = openTestPopup('post', `id:${id}`)
    await waitLoading(again.loading)
    await setTimeout(50)
    equal(checkLoadedPopup(again).reaction.get(), 'none')

    let ownPopup = openTestPopup('post', `id:${own}`)
    await waitLoading(ownPopup.loading)
    equal(checkLoadedPopup(ownPopup).reacted, undefined)
    equal(checkLoadedPopup(ownPopup).reaction.get(), 'none')
    equal((await getTables().reactions.load()).length, 1)
  })

  test('shows reaction to deleted post opened by URL', async () => {
    let url = 'https://mastodon.social/@jane/1'
    let mastodon = loaders.mastodon as Required<typeof loaders.mastodon>
    spyOn(mastodon, 'getPostByUrl', () =>
      Promise.resolve({ id: url, originId: '1', title: 'Network', url })
    )
    spyOn(mastodon, 'getThreadAncestors', () => Promise.resolve([]))
    spyOn(mastodon, 'getThreadDescendants', () => Promise.resolve([]))
    await setPostReaction({ feedId: 'feed', id: 'deleted', url }, 'dislike')

    let popup = openTestPopup('post', url)
    await waitLoading(popup.loading)
    deepEqual(checkLoadedPopup(popup).reacted, {
      feedId: 'feed',
      id: 'deleted',
      url
    })
    await waitUntil(() => checkLoadedPopup(popup).reaction.get() === 'dislike')
    equal((await getTables().reactions.get('deleted'))!.type, 'dislike')

    let other = openTestPopup('post', 'https://mastodon.social/@jane/2')
    await waitLoading(other.loading)
    equal(checkLoadedPopup(other).reacted, undefined)
    equal(checkLoadedPopup(other).reaction.get(), 'none')

    let preview = openTestPopup(
      'post',
      getPostPopupParam({
        loader: 'mastodon',
        origin: { id: 'preview', originId: '1', url }
      })
    )
    await waitLoading(preview.loading)
    equal(checkLoadedPopup(preview).reacted!.id, 'deleted')
    await waitUntil(() => {
      return checkLoadedPopup(preview).reaction.get() === 'dislike'
    })
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
    equal((await loadPost(id1))!.read, 0)
    equal((await loadPost(id2))!.read, 0)

    let now = Math.round(Date.now() / 1000)
    checkLoadedPopup(popup).read!.set(true)
    await setTimeout(1)
    equal((await loadPost(id1))!.read, 1)
    equal((await loadPost(id1))!.readAt! >= now, true)
    equal((await loadPost(id2))!.read, 0)

    checkLoadedPopup(popup).read!.set(false)
    await setTimeout(1)
    equal((await loadPost(id1))!.read, 0)
    equal((await loadPost(id1))!.readAt! >= now, true)
    equal((await loadPost(id2))!.read, 0)
  })

  test('marks post as read when user saw it', async () => {
    let feed = await addFeed(testFeed({ categoryId: GENERAL_CATEGORY }))
    let id = await addPost(testPost({ feedId: feed }))
    let preview = openTestPopup('post', getPostPopupParam({ feedId: feed, id }))
    await waitLoading(preview.loading)
    checkLoadedPopup(preview).seen()
    await setTimeout(1)
    equal((await loadPost(id))!.read, 0)

    markReadOn.set('none')
    let popup = openTestPopup(
      'post',
      getPostPopupParam({ feedId: feed, id }, true)
    )
    await waitLoading(popup.loading)
    checkLoadedPopup(popup).seen()
    await setTimeout(1)
    equal((await loadPost(id))!.read, 0)

    markReadOn.set('open')
    checkLoadedPopup(popup).seen()
    await setTimeout(1)
    equal((await loadPost(id))!.read, 1)
  })

  test('returns post from the history to unread', async () => {
    let feed = await addFeed(testFeed({ categoryId: GENERAL_CATEGORY }))
    let id = await addPost(testPost({ feedId: feed, read: 2, readAt: 1000 }))

    let popup = openTestPopup(
      'post',
      getPostPopupParam({ feedId: feed, id }, true)
    )
    await waitLoading(popup.loading)
    equal(checkLoadedPopup(popup).read!.get(), true)

    // The page marks every opened post as read
    checkLoadedPopup(popup).read!.set(true)
    await setTimeout(1)
    equal((await loadPost(id))!.read, 2)

    checkLoadedPopup(popup).read!.set(false)
    await setTimeout(1)
    equal((await loadPost(id))!.read, 0)
    equal((await loadPost(id))!.readAt, 1000)
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
    equal(checkLoadedPopup(saved).whole, false)
    checkLoadedPopup(saved).read!.set(true)
    await setTimeout(1)
    equal((await loadPost(id))!.read, 1)
    closeLastPopup()

    await deletePost(id)
    let deleted = openTestPopup('post', `read:${url}`)
    await waitLoading(deleted.loading)
    equal(byUrl.calls.length, 1)
    equal(checkLoadedPopup(deleted).post.get().title, 'Network')
    equal(checkLoadedPopup(deleted).read, undefined)
    equal(checkLoadedPopup(deleted).whole, true)
  })

  test('opens candidate post', async () => {
    let post: OriginPost = { id: 'post', originId: 'id', title: 'test' }
    let data = getPostPopupParam({ loader: 'rss', origin: post })

    let popup = openTestPopup('post', data)
    await waitLoading(popup.loading)
    deepEqual(checkLoadedPopup(popup).post.get(), post)
    deepEqual(checkLoadedPopup(popup).read, undefined)
    equal(checkLoadedPopup(popup).feed, undefined)

    let broken1 = openTestPopup('post', 'data:rss:aaa')
    await waitLoading(broken1.loading)
    equal(broken1.notFound, true)

    let unknown = openTestPopup('post', data.replace(':rss:', ':unknown:'))
    await waitLoading(unknown.loading)
    equal(unknown.notFound, true)

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
          formatPublishedAt(commonMessages.get(), i18nFormat.get(), 2000),
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
        read: 1,
        readAt: 5,
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
        post.read,
        post.readAt
      ]),
      [
        ['p', true, 0, null],
        ['s', false, 1, 5],
        ['n', true, 1, 5]
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

  test('opens reposted middle of the thread from its start', async () => {
    let mastodon = loaders.mastodon as Required<typeof loaders.mastodon>
    spyOn(mastodon, 'getThreadDescendants', () => Promise.resolve([]))
    let feed = await addFeed(
      testFeed({ categoryId: GENERAL_CATEGORY, loader: 'mastodon' })
    )
    let repost = await addPost(
      testPost({
        feedId: feed,
        originId: 'r',
        publishedAt: 1060,
        repostedBy: { title: 'Jane' },
        sortedAt: 9000,
        threadId: 'p1'
      })
    )
    await addPost([
      testPost({
        feedId: feed,
        merged: true,
        originId: 'p3',
        publishedAt: 1120,
        threadId: 'p1'
      }),
      testPost({
        feedId: feed,
        merged: true,
        originId: 'p1',
        publishedAt: 1000,
        threadId: 'p1'
      })
    ])
    let popup = openTestPopup('post', `read:${repost}`)
    await waitLoading(popup.loading)
    await setTimeout(10)
    let loaded = checkLoadedPopup(popup)
    equal(loaded.post.get().originId, 'p1')
    equal(
      loaded.publishedAt.get(),
      formatPublishedAt(commonMessages.get(), i18nFormat.get(), 1000)
    )
    let format = i18nFormat.get()
    deepEqual(
      loaded.thread
        .get()
        .map(post => [
          post.originId,
          post.repostedBy?.title,
          post.afterFirstText
        ]),
      [
        [
          'r',
          'Jane',
          postMessages.get().afterFirst({ time: formatDuration(format, 60) })
        ],
        [
          'p3',
          undefined,
          postMessages.get().afterFirst({ time: formatDuration(format, 120) })
        ]
      ]
    )

    loaded.read!.set(true)
    await setTimeout(10)
    equal((await loadPost(repost))?.read, 1)
    equal((loaded.thread.get()[0] as PostValue).read, 1)
  })

  test('opens thread from the feed preview', async () => {
    let popup = openTestPopup(
      'post',
      getPostPopupParam({
        loader: 'rss',
        origin: {
          id: '1',
          originId: '1',
          threadParts: [
            { id: '2', originId: '2', publishedAt: 2000 },
            { id: '3', originId: '3' }
          ]
        }
      })
    )
    await waitLoading(popup.loading)
    deepEqual(
      checkLoadedPopup(popup)
        .thread.get()
        .map(post => [post.originId, post.publishedAtText]),
      [
        ['2', formatPublishedAt(commonMessages.get(), i18nFormat.get(), 2000)],
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
    deepEqual(loaded.post.get(), {
      author: { ...jane, handle: undefined },
      id: '1',
      originId: '1'
    })
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
        loader: 'mastodon',
        origin: { id: 'r', originId: 'r', repostedBy: { title: 'Jane' }, url }
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
        loader: 'rss',
        origin: { id: 'a', originId: 'a', url: 'https://example.com/a' }
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
      author: {
        handle: '@jane@mastodon.social',
        title: 'Jane',
        url: 'https://mastodon.social/@jane'
      },
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
    expectRequest('https://mastodon.social/api/v1/statuses/3').andRespond(500)
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

  test('moves post to Read later and back', async () => {
    let feed = await addFeed(testFeed())
    let id = await addPost(testPost({ feedId: feed, reading: 'slow' }))
    let opened = openTestPopup('post', getPostPopupParam({ feedId: feed, id }))
    await waitLoading(opened.loading)
    let popup = checkLoadedPopup(opened)
    keepMount(popup.later)
    keepMount(popup.laterLocked)
    equal(popup.later.get(), false)
    equal(popup.laterLocked.get(), false)

    popup.later.set(true)
    equal(popup.laterSaving.get(), true)
    popup.later.set(false)
    await waitUntil(() => !popup.laterSaving.get())
    equal(popup.later.get(), true)
    equal((await loadPost(id))?.feedId, null)
    keepMount(popup.post)
    equal(popup.post.get().author, null)
    equal(popup.feed?.get().id, feed)
    equal(popup.laterLocked.get(), false)
    popup.later.set(true)
    equal(popup.laterSaving.get(), false)

    popup.later.set(false)
    await waitUntil(() => !popup.laterSaving.get())
    equal(popup.later.get(), false)
    equal((await loadPost(id))?.feedId, feed)

    await moveToLater((await loadPost(id))!)
    let saved = openTestPopup('post', getPostPopupParam({ feedId: null, id }))
    await waitLoading(saved.loading)
    let loaded = checkLoadedPopup(saved)
    equal(loaded.feed?.get().id, feed)
    equal(loaded.post.get().author, null)
  })

  test('loads parts of saved thread', async () => {
    let bluesky = loaders.bluesky as Required<typeof loaders.bluesky>
    let feed = await addFeed(testFeed({ loader: 'bluesky', reading: 'slow' }))
    let start = await addPost(
      testPost({ feedId: feed, originId: 's', publishedAt: 1, threadId: 's' })
    )
    await addPost(
      testPost({
        feedId: feed,
        merged: true,
        originId: 'p',
        publishedAt: 2,
        threadId: 's'
      })
    )
    await moveToLater((await loadPost(start))!)
    spyOn(bluesky, 'getThreadDescendants', () =>
      Promise.resolve([
        { originId: 'p', publishedAt: 2 },
        { originId: 'n', publishedAt: 3, selfReplyTo: 'p' }
      ])
    )
    let popup = openTestPopup('post', `id:${start}`)
    await waitLoading(popup.loading)
    let thread = checkLoadedPopup(popup).thread
    deepEqual(
      thread.get().map(post => post.originId),
      ['p']
    )
    await waitUntil(() => thread.get().length === 2)
    let added = (await loadThreadPosts(feed, 's')).find(
      post => post.originId === 'n'
    )
    equal(added?.feedId, null)
    equal(added?.later, (await loadPost(start))?.later)
    equal(added?.author?.feedId, feed)
  })

  test('deletes post added by link from Read later', async () => {
    let id = await addPost(
      testPost({
        author: { loader: 'page', title: 'Site', url: 'https://site.com/' },
        feedId: null,
        later: 1
      })
    )
    let opened = openTestPopup('post', getPostPopupParam({ feedId: null, id }))
    await waitLoading(opened.loading)
    let popup = checkLoadedPopup(opened)
    keepMount(popup.later)
    keepMount(popup.laterLocked)
    equal(popup.later.get(), true)
    equal(popup.laterLocked.get(), true)
    keepMount(popup.page)
    keepMount(popup.post)
    equal(popup.page.get()?.title, 'Site')
    equal(popup.post.get().author, null)

    let autoread = openTestPopup(
      'post',
      getPostPopupParam({ feedId: null, id }, true)
    )
    await waitLoading(autoread.loading)
    let reading = checkLoadedPopup(autoread)
    equal(reading.read, undefined)

    keepMount(reading.removing)
    let removing = reading.remove()
    equal(reading.removing.get(), true)
    deepEqual(openedPopups.get(), [opened, autoread])
    await removing
    equal(reading.removing.get(), false)
    deepEqual(openedPopups.get(), [opened])
    equal(await loadPost(id), undefined)
  })

  test('saves preview to Read later', async () => {
    let preview = toPreviewPost(
      { full: 'Preview', id: '1', originId: '1' },
      'rss'
    )
    let opened = openTestPopup('post', getPostPopupParam(preview))
    await waitLoading(opened.loading)
    let popup = checkLoadedPopup(opened)
    keepMount(popup.later)
    keepMount(popup.laterLocked)
    equal(popup.laterLocked.get(), false)
    popup.later.set(false)
    equal(popup.later.get(), false)

    popup.later.set(true)
    equal(popup.later.get(), true)
    equal(popup.laterLocked.get(), true)
    equal(popup.laterSaving.get(), true)
    popup.later.set(false)
    equal(popup.later.get(), true)
    await waitUntil(() => !popup.laterSaving.get())
    deepEqual(
      (await getTables().posts.load`WHERE "later" IS NOT NULL`).map(
        post => post.full
      ),
      ['Preview']
    )
  })

  test('downloads full text of one post', async t => {
    mockRequest()
    t.after(() => {
      checkAndRemoveRequestMock()
    })
    let feedId = await addFeed(testFeed({ url: 'https://a.com/atom' }))
    let extractingId = await addFeed(
      testFeed({ extract: true, url: 'https://b.com/atom' })
    )
    let socialId = await addFeed(
      testFeed({ loader: 'mastodon', url: 'https://mastodon.social/@a' })
    )
    await addPost([
      testPost({
        feedId,
        full: 'Feed',
        id: 'web',
        intro: null,
        url: 'https://a.com/1'
      }),
      testPost({ feedId: extractingId, id: 'extracting' }),
      testPost({ feedId: socialId, id: 'social' }),
      testPost({
        author: { loader: 'page', title: 'Site', url: 'https://site.com/' },
        feedId: null,
        id: 'page',
        later: 1
      }),
      testPost({ feedId, id: 'noUrl', url: null })
    ])
    async function openPost(id: string): Promise<PostPopup> {
      let opened = openTestPopup('post', getPostPopupParam({ feedId, id }))
      await waitLoading(opened.loading)
      let popup = checkLoadedPopup(opened)
      keepMount(popup.extractStatus)
      keepMount(popup.post)
      return popup
    }
    for (let hidden of ['extracting', 'social', 'page', 'noUrl']) {
      equal((await openPost(hidden)).extractStatus.get(), undefined)
    }

    let popup = await openPost('web')
    deepEqual(popup.extractStatus.get(), { status: 'ready' })
    expectRequest('https://a.com/1').andRespond(
      200,
      '<html><body></body></html>'
    )
    equal(await popup.extract(), false)
    deepEqual(popup.extractStatus.get(), {
      error: organizeMessages.get().extractNoArticle,
      status: 'failed'
    })

    let closing = await openPost('web')
    let request = expectRequest('https://a.com/1').andWait()
    let aborted = closing.extract()
    closeLastPopup()
    equal(request.aborted, true)
    equal(await aborted, false)

    let text = 'Long paragraph of the article. '.repeat(40)
    let article =
      `<html><body><article><p>${text}</p>` +
      '<p><img src="/a.png"></p></article></body></html>'
    let update = spyOn(getTables().posts, 'update', () => {
      return Promise.reject(new Error('Bug'))
    })
    expectRequest('https://a.com/1').andRespond(200, article)
    await expectWarning(async () => {
      equal(await popup.extract(), false)
    }, ['Error: Bug'])
    deepEqual(popup.extractStatus.get(), { error: 'Bug', status: 'failed' })
    update.restore()

    expectRequest('https://a.com/1').andRespond(200, article)
    let extracting = popup.extract()
    deepEqual(popup.extractStatus.get(), { status: 'downloading' })
    equal(await extracting, true)
    deepEqual(popup.extractStatus.get(), { status: 'done' })
    await waitUntil(() => !!popup.post.get().full?.includes('Long paragraph'))
    let saved = await loadPost('web')
    equal(saved!.intro, 'Feed')
    deepEqual(saved!.media, [
      { fromText: true, type: 'image', url: 'https://a.com/a.png' }
    ])

    closeLastPopup()
    equal((await openPost('web')).extractStatus.get(), undefined)
  })
})
