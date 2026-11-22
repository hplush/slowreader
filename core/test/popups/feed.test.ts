import { restoreAll, spyOn } from 'nanospy'
import { keepMount } from 'nanostores'
import { deepEqual, equal, match, notEqual } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  addAccount,
  addCategory,
  addFeed,
  addPost,
  changeAccount,
  changeFeed,
  closeLastPopup,
  commonMessages,
  createPostsList,
  type FeedPopup,
  formatPublishedAt,
  GENERAL_CATEGORY,
  getLinkPopup,
  getPopupId,
  getTables,
  HTTPStatusError,
  i18nFormat,
  loaders,
  loadFeed,
  loadFeeds,
  loadPosts,
  loadPostsByFeed,
  NetworkError,
  openedPopups,
  organizeMessages,
  setPostReaction,
  testAccount,
  testFeed,
  testPost,
  trackSeen,
  waitLoading
} from '../../index.ts'
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

describe('feed popup', () => {
  beforeEach(() => {
    startClient()
    openRoute({ params: {}, route: 'add' })
    mockRequest()
  })

  afterEach(async () => {
    await cleanClient()
    checkAndRemoveRequestMock()
  })

  test('opens links from the text', () => {
    let profile = 'https://bsky.app/profile/jane'
    equal(getLinkPopup('Jane', profile, 'rss'), 'feed')
    equal(getLinkPopup('link', `${profile}/post/1`, 'mastodon'), 'post')

    // Other sites have Mastodon’s paths too
    let mastodon = 'https://other.social/@jane'
    equal(getLinkPopup('@jane', mastodon, 'bluesky'), 'feed')
    equal(getLinkPopup('Jane', mastodon, 'mastodon'), undefined)
    equal(getLinkPopup('link', `${mastodon}/1`, 'mastodon'), 'post')
    equal(getLinkPopup('@jane', `${mastodon}/1`, 'bluesky'), undefined)
    equal(getLinkPopup('@jane', `${mastodon}/1`, undefined), undefined)

    // Link preview has no text
    equal(getLinkPopup('', `${profile}/post/1`, 'rss'), 'post')
    equal(getLinkPopup('', `${mastodon}/1`, 'mastodon'), 'post')
    equal(getLinkPopup('', mastodon, 'mastodon'), undefined)

    equal(getLinkPopup('@jane', 'https://example.com/jane', 'rss'), undefined)
    equal(getLinkPopup('@jane', 'http://other.social/@jane', 'rss'), undefined)
    equal(getLinkPopup('@jane', 'https:', 'mastodon'), undefined)
  })

  test('loads 404 for feeds by URL popup', async () => {
    expectRequest('http://a.com/one').andRespond(404)
    await expectWarning(async () => {
      let feed1Popup = openTestPopup('feed', 'http://a.com/one')
      equal(openedPopups.get().length, 1)
      equal(feed1Popup.name, 'feed')
      equal(feed1Popup.param, 'http://a.com/one')
      equal(feed1Popup.loading.get(), true)

      await waitLoading(feed1Popup.loading)
      equal(feed1Popup.notFound, true)
    }, [])

    closeLastPopup()
    equal(openedPopups.get().length, 0)

    expectRequest('http://a.com/two').andRespond(200, '<html>Nothing</html>')
    let feed2Popup = openTestPopup('feed', 'http://a.com/two')
    equal(openedPopups.get().length, 1)
    equal(feed2Popup.param, 'http://a.com/two')
    equal(feed2Popup.loading.get(), true)

    await waitLoading(feed2Popup.loading)
    equal(feed2Popup.notFound, true)
  })

  test('survives not URL in the popup param', async () => {
    expectRequest('not-url').andRespond(404)
    await expectWarning(async () => {
      let popup = openTestPopup('feed', 'not-url')
      await waitLoading(popup.loading)
      equal(popup.notFound, true)
    }, [])
  })

  test('loads existing feed popup on 404', async () => {
    let feedId = await addFeed(testFeed({ url: 'http://a.com/404' }))
    expectRequest('http://a.com/404').andRespond(404)
    await expectWarning(async () => {
      let popup = openTestPopup('feed', 'http://a.com/404')
      equal(openedPopups.get().length, 1)
      equal(popup.loading.get(), true)
      await waitLoading(popup.loading)
      equal(popup.notFound, false)
      equal(checkLoadedPopup(popup).feed.get()?.id, feedId)
      deepEqual(checkLoadedPopup(popup).posts.get().isLoading, true)
      await checkLoadedPopup(popup).posts.loading
      deepEqual(checkLoadedPopup(popup).posts.get().isLoading, false)
      deepEqual(checkLoadedPopup(popup).posts.get().list.length, 0)
      equal(
        HTTPStatusError.is(checkLoadedPopup(popup).posts.get().error, [404]),
        true
      )
      equal(checkLoadedPopup(popup).posts.get().hasNext, false)
      equal(checkLoadedPopup(popup).site.get(), 'http://a.com')
    }, [])
  })

  test('shows error if saved feed is not a feed anymore', async () => {
    await addFeed(testFeed({ url: 'https://a.com/feed' }))
    expectRequest('https://a.com/feed').andRespond(
      200,
      '<html><body>Blog was closed</body></html>',
      'text/html'
    )
    let popup = openTestPopup('feed', 'https://a.com/feed')
    await waitLoading(popup.loading)
    equal(popup.notFound, false)
    await checkLoadedPopup(popup).posts.loading
    deepEqual(checkLoadedPopup(popup).posts.get().list, [])
    equal(
      String(checkLoadedPopup(popup).posts.get().error),
      'ParseError: No feed at https://a.com/feed'
    )
  })

  test('shows existing feed before posts are loaded', async () => {
    let feedId = await addFeed(
      testFeed({
        originTitle: 'Atom',
        title: 'Mine',
        url: 'https://a.com/atom'
      })
    )
    expectRequest('https://a.com/atom').andRespond(
      200,
      '<feed><title>Atom</title>' +
        '<link rel="next" href="https://a.com/atom?page=2" />' +
        '<entry><id>2</id><updated>2023-07-01T00:00:00Z</updated></entry>' +
        '</feed>',
      'text/xml'
    )
    let popup = openTestPopup('feed', 'https://a.com/atom')
    await waitLoading(popup.loading)
    equal(checkLoadedPopup(popup).feed.get()?.id, feedId)
    equal(checkLoadedPopup(popup).posts.get().isLoading, true)

    await checkLoadedPopup(popup).posts.loading
    equal(checkLoadedPopup(popup).posts.get().isLoading, false)
    equal(checkLoadedPopup(popup).posts.get().hasNext, true)
    deepEqual(checkLoadedPopup(popup).posts.get().list[0]?.originId, '2')
    equal(
      checkLoadedPopup(popup).activity.get()?.warning,
      organizeMessages.get().abandoned
    )
    let [preview] = checkLoadedPopup(popup).previews.get()
    equal(preview?.originId, '2')
    equal(preview.loader, 'rss')

    expectRequest('https://a.com/atom?page=2').andRespond(
      200,
      '<feed><title>Atom</title>' +
        '<entry><id>1</id><updated>2023-06-01T00:00:00Z</updated></entry>' +
        '</feed>',
      'text/xml'
    )
    await checkLoadedPopup(popup).posts.next()
    equal(checkLoadedPopup(popup).posts.get().hasNext, false)
    deepEqual(
      checkLoadedPopup(popup)
        .posts.get()
        .list.map(post => post.originId),
      ['2', '1']
    )

    await checkLoadedPopup(popup).remove()
    equal(checkLoadedPopup(popup).feed.get(), undefined)
    equal(checkLoadedPopup(popup).title, 'Atom')
    let addedId = await checkLoadedPopup(popup).add()
    equal(checkLoadedPopup(popup).feed.get()?.id, addedId)
  })

  test('shows statistics and reactions of the feed', async t => {
    let feedId = await addFeed(
      testFeed({ loader: 'mastodon', url: 'https://mastodon.social/@jane' })
    )
    spyOn(loaders.mastodon, 'getPosts', () => {
      return createPostsList(() => Promise.resolve([[], undefined]))
    })
    t.after(restoreAll)
    let post = 'https://mastodon.social/@jane/1'
    let now = Math.round(Date.now() / 1000)
    await getTables().reactions.create([
      { at: now - 20, feedId, id: 'a', type: 'like', url: post },
      {
        at: now - 10,
        feedId,
        id: 'b',
        type: 'dislike',
        url: 'https://a.com/1'
      },
      { at: now, feedId, id: 'c', type: 'like' },
      { at: now, feedId, id: 'd', type: 'open' },
      { at: now, feedId: 'other', id: 'e', type: 'like' }
    ])
    trackSeen(feedId, 5)

    let popup = openTestPopup('feed', 'https://mastodon.social/@jane')
    await waitLoading(popup.loading)
    let loaded = checkLoadedPopup(popup)
    let unbind = loaded.stats.listen(() => {})
    await waitUntil(() => loaded.reactions.get().length === 2)
    deepEqual(
      loaded.reactions.get().map(reaction => ({
        id: reaction.id,
        liked: reaction.liked,
        popup: reaction.popup,
        title: reaction.title,
        url: reaction.url
      })),
      [
        {
          id: 'b',
          liked: false,
          popup: undefined,
          title: 'a.com/1',
          url: 'https://a.com/1'
        },
        {
          id: 'a',
          liked: true,
          popup: post,
          title: 'mastodon.social/@jane/1',
          url: post
        }
      ]
    )
    equal(
      loaded.reactions.get()[0]!.reactedAt,
      formatPublishedAt(i18nFormat.get(), now - 10)
    )
    await waitUntil(() => loaded.stats.get()?.liked === 2)
    deepEqual(loaded.stats.get(), {
      disliked: 1,
      liked: 2,
      max: 5,
      opened: 1,
      seen: 5
    })

    await loaded.remove()
    unbind()
    deepEqual(loaded.reactions.get(), [])
    equal(loaded.stats.get(), undefined)
  })

  test('loads liked posts of social feed by URLs', async t => {
    let author = 'https://mastodon.social/@jane'
    let feedId = await addFeed(testFeed({ loader: 'mastodon', url: author }))
    let mastodon = loaders.mastodon as Required<typeof loaders.mastodon>
    spyOn(mastodon, 'getPosts', () => {
      return createPostsList(() => Promise.resolve([[], undefined]))
    })
    let offline = false
    let byUrl = spyOn(mastodon, 'getPostByUrl', (task, url) => {
      if (offline) {
        return Promise.reject(new Error('Offline'))
      } else if (url.endsWith('/2')) {
        return Promise.reject(new HTTPStatusError(404, url, '', new Headers()))
      } else {
        return Promise.resolve({
          author: {
            title: 'Author',
            url: url.endsWith('/1') ? 'https://mastodon.social/@other' : author
          },
          id: url,
          originId: url,
          url
        })
      }
    })
    t.after(restoreAll)
    await getTables().reactions.create([
      ...Array.from({ length: 12 }, (_, i) => ({
        at: 100 - i,
        feedId,
        id: `liked${i}`,
        type: 'like' as const,
        url: `${author}/${i}`
      })),
      {
        at: 1,
        feedId,
        id: 'web',
        type: 'like' as const,
        url: 'https://a.com/1'
      },
      { at: 1, feedId, id: 'no-url', type: 'like' as const },
      { at: 1, feedId, id: 'opened', type: 'open' as const }
    ])

    let popup = openTestPopup('feed', author)
    await waitLoading(popup.loading)
    let loaded = checkLoadedPopup(popup)
    let unbindLiked = loaded.likedPosts.listen(() => {})
    let unbindDisliked = loaded.dislikedPosts.listen(() => {})
    t.after(() => {
      unbindLiked()
      unbindDisliked()
    })
    await waitUntil(() => !!loaded.likedPosts.get())
    equal(loaded.dislikedPosts.get(), undefined)

    let liked = loaded.likedPosts.get()!
    await liked.loading
    deepEqual(
      liked.get().list.map(post => post.url),
      [0, 1, 3, 4, 5, 6, 7, 8, 9].map(i => `${author}/${i}`)
    )
    deepEqual(
      liked.get().list.map(post => post.author?.url),
      [undefined, 'https://mastodon.social/@other', ...Array(7)]
    )
    equal(liked.get().hasNext, true)
    equal(byUrl.calls.length, 10)

    await liked.next()
    equal(liked.get().list.length, 11)
    equal(liked.get().hasNext, false)

    offline = true
    await setPostReaction({ feedId, id: 'bad', url: `${author}/20` }, 'dislike')
    await waitUntil(() => !!loaded.dislikedPosts.get())
    equal(loaded.likedPosts.get(), liked)
    await loaded.dislikedPosts.get()!.loading
    equal(loaded.dislikedPosts.get()!.get().error!.message, 'Offline')

    await setPostReaction({ feedId, id: 'bad' }, 'none')
    await waitUntil(() => !loaded.dislikedPosts.get())
  })

  test('has no posts to load for liked posts of web feed', async () => {
    let feedId = await addFeed(testFeed({ url: 'https://a.com/atom' }))
    expectRequest('https://a.com/atom').andRespond(
      200,
      '<feed><title>Atom</title></feed>',
      'text/xml'
    )
    await setPostReaction({ feedId, id: '1', url: 'https://a.com/1' }, 'like')

    let popup = openTestPopup('feed', 'https://a.com/atom')
    await waitLoading(popup.loading)
    let loaded = checkLoadedPopup(popup)
    await waitUntil(() => loaded.reactions.get().length === 1)
    equal(loaded.likedPosts.get(), undefined)
  })

  test('keeps title of unsubscribed feed without origin title', async () => {
    await addFeed(testFeed({ title: 'Mine', url: 'https://a.com/atom' }))
    expectRequest('https://a.com/atom').andRespond(
      200,
      '<feed><title>Atom</title></feed>',
      'text/xml'
    )
    let popup = openTestPopup('feed', 'https://a.com/atom')
    await waitLoading(popup.loading)
    await checkLoadedPopup(popup).remove()
    equal(checkLoadedPopup(popup).feed.get(), undefined)
    equal(checkLoadedPopup(popup).title, 'Mine')
  })

  test('loads feeds by URL popup', async () => {
    expectRequest('https://a.com/atom').andRespond(
      200,
      '<feed><title>Atom</title>' +
        '<entry><id>2</id><updated>2023-07-01T00:00:00Z</updated></entry>' +
        '<entry><id>1</id><updated>2023-06-01T00:00:00Z</updated></entry>' +
        '</feed>',
      'text/xml'
    )
    let popup = openTestPopup('feed', 'https://a.com/atom')
    equal(openedPopups.get().length, 1)
    equal(popup.loading.get(), true)

    await waitLoading(popup.loading)
    equal(checkLoadedPopup(popup).feed.get(), undefined)
    equal(checkLoadedPopup(popup).title, 'Atom')
    equal(checkLoadedPopup(popup).loader, 'atom')
    deepEqual(checkLoadedPopup(popup).posts.get().isLoading, false)
    deepEqual(checkLoadedPopup(popup).posts.get().list.length, 2)
    deepEqual(checkLoadedPopup(popup).posts.get().list[0]?.originId, '2')

    deepEqual(checkLoadedPopup(popup).categories.get(), [
      [GENERAL_CATEGORY, 'General'],
      ['new', 'Add category…']
    ])

    let id = await addCategory({ title: 'Test' })
    deepEqual(checkLoadedPopup(popup).categories.get(), [
      [GENERAL_CATEGORY, 'General'],
      [id, 'Test'],
      ['new', 'Add category…']
    ])

    let addedId = await checkLoadedPopup(popup).add()
    let feedId = checkLoadedPopup(popup).feed.get()!.id
    equal(addedId, feedId)
    equal(checkLoadedPopup(popup).feed.get()!.url, 'https://a.com/atom')
    equal(checkLoadedPopup(popup).feed.get()!.title, 'Atom')
    equal((await loadFeed(feedId))!.title, 'Atom')
    equal((await loadFeed(feedId))!.lastOriginId, '2')
    equal((await loadFeed(feedId))!.lastPublishedAt, 1688169600)

    await changeFeed(feedId, { title: 'Test Atom' })
    equal(checkLoadedPopup(popup).feed.get()!.title, 'Test Atom')
    equal((await loadFeed(feedId))!.originTitle, 'Atom')

    await checkLoadedPopup(popup).rename('  Mine  ')
    equal((await loadFeed(feedId))!.title, 'Mine')
    await checkLoadedPopup(popup).rename(' ')
    equal((await loadFeed(feedId))!.title, 'Atom')

    let posts = await loadPostsByFeed(feedId)
    deepEqual(
      posts.map(post => [post.originId, post.reading]),
      [
        ['2', 'slow'],
        ['1', 'slow']
      ]
    )

    await checkLoadedPopup(popup).remove()
    equal(checkLoadedPopup(popup).feed.get(), undefined)
    deepEqual(await loadPostsByFeed(feedId), [])
  })

  test('opens website from the feed', async () => {
    expectRequest('https://a.com/rss').andRespond(
      200,
      '<rss><channel><title>RSS</title>' +
        '<link>https://b.com/blog/</link></channel></rss>',
      'application/rss+xml'
    )
    let popup = openTestPopup('feed', 'https://a.com/rss')
    await waitLoading(popup.loading)
    equal(checkLoadedPopup(popup).site.get(), 'https://b.com/blog/')
  })

  test('opens website of feed without link', async () => {
    expectRequest('https://a.com/rss').andRespond(
      200,
      '<rss><channel><title>RSS</title></channel></rss>',
      'application/rss+xml'
    )
    let popup = openTestPopup('feed', 'https://a.com/rss')
    await waitLoading(popup.loading)
    equal(checkLoadedPopup(popup).site.get(), 'https://a.com')
  })

  test('finds avatar of unsubscribed feed', async () => {
    expectRequest('https://a.com/rss').andRespond(
      200,
      '<rss><channel><title>RSS</title>' +
        '<image><url>logo.png</url></image></channel></rss>',
      'application/rss+xml'
    )
    let popup = openTestPopup('feed', 'https://a.com/rss')
    await waitLoading(popup.loading)

    expectRequest('https://a.com/logo.png').andRespond(
      200,
      'IMAGE',
      'image/png'
    )
    keepMount(checkLoadedPopup(popup).avatar)
    await waitUntil(() => !!checkLoadedPopup(popup).avatar.get())
    equal(checkLoadedPopup(popup).avatar.get(), 'https://a.com/logo.png')

    let feedId = await checkLoadedPopup(popup).add()
    equal((await loadFeed(feedId!))!.avatar, 'https://a.com/logo.png')
  })

  test('updates avatar of subscribed feed', async () => {
    let feedId = await addFeed(
      testFeed({ avatar: 'https://a.com/old.png', url: 'https://a.com/rss' })
    )
    expectRequest('https://a.com/rss').andRespond(
      200,
      '<rss><channel><title>RSS</title>' +
        '<image><url>new.png</url></image></channel></rss>',
      'application/rss+xml'
    )
    let popup = openTestPopup('feed', 'https://a.com/rss')
    await waitLoading(popup.loading)

    expectRequest('https://a.com/new.png').andRespond(200, 'IMAGE', 'image/png')
    keepMount(checkLoadedPopup(popup).avatar)
    await waitUntil(
      async () => (await loadFeed(feedId))?.avatar === 'https://a.com/new.png'
    )
    equal(checkLoadedPopup(popup).avatar.get(), 'https://a.com/new.png')
  })

  test('does not download profile of unknown author', async () => {
    expectRequest(
      'https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=a.com'
    ).andRespond(400)
    let unknown = openTestPopup('feed', 'https://bsky.app/profile/a.com')
    await waitLoading(unknown.loading)
    equal(unknown.notFound, true)

    closeLastPopup()
    expectRequest(
      'https://mastodon.social/api/v1/accounts/lookup?acct=jane'
    ).andRespond(404)
    await expectWarning(async () => {
      let missing = openTestPopup('feed', 'https://mastodon.social/@jane')
      await waitLoading(missing.loading)
      equal(missing.notFound, true)
    }, [])
  })

  test('finds existing feed by normalized URL', async () => {
    let feedId = await addFeed(
      testFeed({ loader: 'mastodon', url: 'https://mastodon.social/@jane' })
    )
    expectRequest(
      'https://mastodon.social/api/v1/accounts/lookup?acct=Jane'
    ).andRespond(
      200,
      JSON.stringify({ acct: 'jane', display_name: 'Jane', id: '1' }),
      'application/json'
    )
    let popup = openTestPopup('feed', 'https://mastodon.social/@Jane/')
    await waitLoading(popup.loading)
    equal(checkLoadedPopup(popup).feed.get()?.id, feedId)
  })

  test('adds only 10 latest posts with a feed', async () => {
    let entries = ''
    for (let i = 12; i > 0; i--) {
      entries +=
        `<entry><id>${i}</id>` +
        `<updated>2023-07-${String(i).padStart(2, '0')}T00:00:00Z</updated>` +
        '</entry>'
    }
    expectRequest('https://a.com/atom').andRespond(
      200,
      `<feed><title>Atom</title>${entries}</feed>`,
      'text/xml'
    )
    let popup = openTestPopup('feed', 'https://a.com/atom')
    await waitLoading(popup.loading)

    let feedId = await checkLoadedPopup(popup).add()
    let posts = await loadPostsByFeed(feedId!)
    deepEqual(
      posts.map(post => post.originId),
      ['12', '11', '10', '9', '8', '7', '6', '5', '4', '3']
    )
  })

  test('destroys replaced popups and keep unchanged', async () => {
    expectRequest('https://a.com/atom').andRespond(
      200,
      '<feed><title>Atom</title>' +
        '<entry><id>2</id><updated>2023-07-01T00:00:00Z</updated></entry>' +
        '<entry><id>1</id><updated>2023-06-01T00:00:00Z</updated></entry>' +
        '</feed>',
      'text/xml'
    )
    expectRequest('https://a.com/atom').andRespond(
      200,
      '<feed><title>Atom</title>' +
        '<entry><id>2</id><updated>2023-07-01T00:00:00Z</updated></entry>' +
        '<entry><id>1</id><updated>2023-06-01T00:00:00Z</updated></entry>' +
        '</feed>',
      'text/xml'
    )

    openRoute({
      hash: `feed=https://a.com/atom,feed=https://a.com/atom`,
      params: {},
      route: 'add'
    })
    equal(openedPopups.get().length, 2)
    let popup1 = getPopup('feed', 0)
    let popup2 = getPopup('feed', 1)
    await waitLoading(popup1.loading)
    equal(checkLoadedPopup(popup1).feed.get(), undefined)
    equal(checkLoadedPopup(popup2).feed.get(), undefined)

    let feedId = await addFeed(testFeed({ url: 'https://a.com/atom' }))
    equal(checkLoadedPopup(popup1).feed.get()!.url, 'https://a.com/atom')
    equal(checkLoadedPopup(popup1).feed.get()?.id, feedId)
    equal(checkLoadedPopup(popup2).feed.get()?.id, feedId)

    closeLastPopup()
    deepEqual(openedPopups.get(), [popup1])

    await checkLoadedPopup(popup1).remove()
    equal(checkLoadedPopup(popup1).feed.get(), undefined)
    equal(checkLoadedPopup(popup2).feed.get()?.id, feedId)
  })

  test('has helpers to generate popup ID', () => {
    match(getPopupId('feed', 'https://example.com/'), /^[a-z_-]+$/)
    equal(
      getPopupId('feed', 'https://example.com/'),
      getPopupId('feed', 'https://example.com/')
    )
    notEqual(
      getPopupId('feed', 'https://example.com/'),
      getPopupId('feed', 'http://example.com/')
    )
  })

  test('ignores url protocol while checking for existing feeds', async () => {
    expectRequest('http://a.com/atom').andRespond(
      200,
      '<feed><title>Atom</title>' +
        '<entry><id>2</id><updated>2023-07-01T00:00:00Z</updated></entry>' +
        '<entry><id>1</id><updated>2023-06-01T00:00:00Z</updated></entry>' +
        '</feed>',
      'text/xml'
    )
    let popup = openTestPopup('feed', 'http://a.com/atom')
    await waitLoading(popup.loading)

    let addedId = await checkLoadedPopup(popup).add()
    let feedId = checkLoadedPopup(popup).feed.get()!.id
    equal(addedId, feedId)
    equal((await loadFeed(feedId))!.url, 'http://a.com/atom')

    expectRequest('https://a.com/atom').andRespond(
      200,
      '<feed><title>Atom</title>' +
        '<entry><id>2</id><updated>2023-07-01T00:00:00Z</updated></entry>' +
        '<entry><id>1</id><updated>2023-06-01T00:00:00Z</updated></entry>' +
        '</feed>',
      'text/xml'
    )
    let popup2 = openTestPopup('feed', 'https://a.com/atom')
    await waitLoading(popup2.loading)
    equal(checkLoadedPopup(popup2).feed.get()!.url, 'http://a.com/atom')
  })
})

const AUTHOR = 'https://mastodon.social/@jane'

describe('feed popup with accounts', () => {
  beforeEach(() => {
    startClient()
    openRoute({ params: {}, route: 'add' })
    mockRequest()
  })

  afterEach(async () => {
    await cleanClient()
    restoreAll()
    checkAndRemoveRequestMock()
  })

  let account = loaders.mastodon.account!

  function spyPosts(): ReturnType<typeof spyOn> {
    spyOn(loaders.mastodon, 'loadFeedData', () => {
      return Promise.resolve({ title: 'Jane', url: AUTHOR })
    })
    return spyOn(loaders.mastodon, 'getPosts', () => {
      return createPostsList(() =>
        Promise.resolve([
          [{ originId: 'recent', publishedAt: 5000 }],
          undefined
        ])
      )
    })
  }

  async function openSavedAuthor(): Promise<FeedPopup> {
    let popup = openTestPopup('feed', AUTHOR)
    await waitLoading(popup.loading)
    return checkLoadedPopup(popup)
  }

  function openAuthor(): Promise<FeedPopup> {
    expectRequest(
      'https://mastodon.social/api/v1/accounts/lookup?acct=jane'
    ).andRespond(
      200,
      JSON.stringify({ acct: 'jane', display_name: 'Jane', id: '1' }),
      'application/json'
    )
    return openSavedAuthor()
  }

  function authorPost(
    accountId: string,
    originId: string
  ): ReturnType<typeof testPost> {
    return testPost({
      accountId,
      author: { title: 'Jane', url: AUTHOR },
      feedId: null,
      originId
    })
  }

  test('shows followed author as subscribed', async () => {
    spyPosts()
    let other = await addAccount(testAccount({ title: 'A' }))
    let followed = await addAccount(testAccount({ title: 'B' }))
    let checks = spyOn(account, 'isFollowing', auth => {
      return Promise.resolve(auth.account.id === followed)
    })

    let popup = await openAuthor()
    deepEqual(
      popup.accounts.map(i => i.id),
      [other, followed]
    )
    equal(popup.followedBy.get()?.id, followed)
    equal(popup.feed.get(), undefined)
    deepEqual(
      checks.calls.map(call => call[1]),
      [AUTHOR, AUTHOR]
    )
  })

  test('checks following by posts offline', async () => {
    spyPosts()
    let accountId = await addAccount(testAccount())
    await addPost(authorPost(accountId, '1'))
    spyOn(account, 'isFollowing', () => {
      return Promise.reject(new NetworkError(new TypeError('offline')))
    })

    let popup = await openAuthor()
    equal(popup.followedBy.get()?.id, accountId)
  })

  test('opens author profile', async () => {
    spyPosts()
    let popup = await openAuthor()
    equal(popup.site.get(), AUTHOR)
  })

  test('does not check following for other services', async () => {
    let checks = spyOn(account, 'isFollowing', () => Promise.resolve(true))
    await addAccount(testAccount({ service: 'bluesky' }))
    spyPosts()
    let popup = await openAuthor()
    equal(popup.accounts.length, 0)
    equal(popup.followedBy.get(), undefined)
    equal(checks.calls.length, 0)
  })

  test('creates virtual feed on changes of followed author', async () => {
    spyPosts()
    let categoryId = await addCategory({ title: 'Social' })
    let accountId = await addAccount(
      testAccount({ categoryId, reading: 'slow' })
    )
    spyOn(account, 'isFollowing', () => Promise.resolve(true))
    await addPost([
      authorPost(accountId, '1'),
      testPost({
        accountId,
        author: { title: 'Other', url: 'https://a.social/@other' },
        feedId: null,
        originId: '2',
        repostedBy: { title: 'Jane', url: AUTHOR }
      }),
      testPost({
        accountId,
        author: { title: 'Other', url: 'https://a.social/@other' },
        feedId: null,
        originId: '3'
      })
    ])

    let popup = await openAuthor()
    equal(popup.owner.get()?.id, accountId)
    equal(popup.reading.get(), 'slow')
    await popup.change({ reading: 'fast' })
    equal(popup.reading.get(), 'fast')

    let [feed] = await loadFeeds()
    equal(feed!.accountId, accountId)
    equal(feed!.categoryId, null)
    equal(feed!.reading, 'fast')
    equal(feed!.title, 'Jane')
    equal(feed!.url, AUTHOR)
    equal(popup.feed.get()?.id, feed!.id)
    equal(popup.followedBy.get(), undefined)

    let posts = (await loadPosts()).toSorted((a, b) => {
      return a.originId.localeCompare(b.originId)
    })
    deepEqual(
      posts.map(i => [i.originId, i.feedId, i.accountId, i.reading]),
      [
        ['1', feed!.id, null, 'fast'],
        ['2', feed!.id, null, 'fast'],
        ['3', null, accountId, 'fast']
      ]
    )
    equal(posts[0]!.author, null)
    equal(posts[1]!.author?.title, 'Other')

    await popup.change({ reading: null })
    equal(popup.reading.get(), 'slow')
    deepEqual(
      (await loadPostsByFeed(feed!.id)).map(i => i.reading),
      ['slow', 'slow']
    )
    await changeAccount(accountId, { reading: 'fast' })
    equal((await loadFeed(feed!.id))!.reading, null)
  })

  test('renames followed author', async () => {
    spyPosts()
    await addAccount(testAccount())
    spyOn(account, 'isFollowing', () => Promise.resolve(true))
    let popup = await openAuthor()

    await popup.rename(' ')
    equal((await loadFeeds()).length, 0)

    await popup.rename('My Jane')
    equal((await loadFeeds())[0]!.title, 'My Jane')
    equal((await loadFeeds())[0]!.reading, null)
  })

  test('follows by default account on subscribing', async () => {
    spyPosts()
    await addAccount(testAccount({ title: 'A' }))
    let accountId = await addAccount(
      testAccount({
        categoryId: await addCategory({ title: 'Social' }),
        follow: true,
        reading: 'slow',
        title: 'B'
      })
    )
    spyOn(account, 'isFollowing', () => Promise.resolve(false))
    let follows = spyOn(account, 'follow', () => Promise.resolve())

    let popup = await openAuthor()
    equal(popup.followedBy.get(), undefined)
    let feedId = await popup.add()

    let feed = (await loadFeed(feedId!))!
    equal(feed.accountId, accountId)
    equal(feed.categoryId, null)
    equal(feed.reading, null)
    equal(popup.reading.get(), 'slow')
    deepEqual(
      (await loadPostsByFeed(feedId!)).map(i => i.reading),
      ['slow']
    )
    deepEqual(
      follows.calls.map(call => [call[0].account.id, call[1]]),
      [[accountId, AUTHOR]]
    )
  })

  test('finishes subscribing after the popup was closed', async () => {
    spyPosts()
    let popup = await openAuthor()
    let lookup = expectRequest(
      'https://mastodon.social/api/v1/accounts/lookup?acct=jane'
    ).andWait()
    let adding = popup.add()
    closeLastPopup()
    await lookup(
      200,
      JSON.stringify({ acct: 'jane', display_name: 'Jane', id: '1' }),
      'application/json'
    )
    equal((await loadFeed((await adding)!))!.loaderData, '{"id":"1"}')
  })

  test('keeps author unsubscribed on follow error', async () => {
    spyPosts()
    await addAccount(testAccount({ follow: true }))
    spyOn(account, 'isFollowing', () => Promise.resolve(false))
    spyOn(account, 'follow', () => {
      return Promise.reject(new NetworkError(new TypeError('offline')))
    })

    let popup = await openAuthor()
    equal(await popup.add(), undefined)
    equal(popup.accountError.get(), commonMessages.get().networkError)
    equal((await loadFeeds()).length, 0)
  })

  test('changes account of the feed', async () => {
    spyPosts()
    let a = await addAccount(testAccount({ title: 'A' }))
    let b = await addAccount(testAccount({ title: 'B' }))
    let feedId = await addFeed(
      testFeed({ lastPublishedAt: 1000, loader: 'mastodon', url: AUTHOR })
    )
    let calls: string[] = []
    spyOn(account, 'follow', auth => {
      calls.push(`follow ${auth.account.id}`)
      return Promise.resolve()
    })
    spyOn(account, 'unfollow', auth => {
      calls.push(`unfollow ${auth.account.id}`)
      return Promise.resolve()
    })
    let popup = await openSavedAuthor()
    await popup.change({ reading: 'slow' })
    equal((await loadFeed(feedId))!.reading, 'slow')

    await popup.changeAccount(a)
    equal((await loadFeed(feedId))!.accountId, a)
    deepEqual(calls, [`follow ${a}`])
    deepEqual(
      (await loadPostsByFeed(feedId)).map(i => i.originId),
      ['recent']
    )

    await popup.changeAccount(a)
    deepEqual(calls, [`follow ${a}`])

    await popup.changeAccount(b)
    equal((await loadFeed(feedId))!.accountId, b)
    deepEqual(calls, [`follow ${a}`, `follow ${b}`, `unfollow ${a}`])
    equal((await loadPostsByFeed(feedId)).length, 1)

    await popup.changeAccount(undefined)
    equal((await loadFeed(feedId))!.accountId, null)
    deepEqual(calls, [
      `follow ${a}`,
      `follow ${b}`,
      `unfollow ${a}`,
      `unfollow ${b}`
    ])
  })

  test('keeps account on unfollow error', async () => {
    spyPosts()
    let a = await addAccount(testAccount({ title: 'A' }))
    let b = await addAccount(testAccount({ title: 'B' }))
    let feedId = await addFeed(
      testFeed({ accountId: a, loader: 'mastodon', url: AUTHOR })
    )
    spyOn(account, 'follow', () => Promise.resolve())
    spyOn(account, 'unfollow', () => {
      return Promise.reject(new HTTPStatusError(500, AUTHOR, '', new Headers()))
    })
    let popup = await openSavedAuthor()

    await popup.changeAccount(b)
    equal((await loadFeed(feedId))!.accountId, a)
    equal(popup.accountError.get(), commonMessages.get().error5xx)

    await popup.remove()
    equal(popup.deleting.get(), false)
    equal((await loadFeeds()).length, 1)
  })

  test('changes account of followed author', async () => {
    spyPosts()
    let categoryId = await addCategory({ title: 'Social' })
    let a = await addAccount(
      testAccount({ categoryId, reading: 'fast', title: 'A' })
    )
    spyOn(account, 'isFollowing', () => Promise.resolve(true))
    let unfollows = spyOn(account, 'unfollow', () => Promise.resolve())
    let popup = await openAuthor()

    await popup.changeAccount(undefined)
    equal(unfollows.calls[0]![0].account.id, a)
    let [feed] = await loadFeeds()
    equal(feed!.accountId, null)
    equal(feed!.categoryId, categoryId)
    equal(feed!.reading, 'fast')
  })

  test('unsubscribes virtual feed on every account', async () => {
    spyPosts()
    let accountId = await addAccount(testAccount())
    let other = await addAccount(testAccount())
    let notFollowing = await addAccount(testAccount())
    await addAccount(testAccount({ expired: true }))
    let feedId = await addFeed(
      testFeed({ accountId, loader: 'mastodon', url: AUTHOR })
    )
    await addPost(testPost({ feedId }))
    let checks = spyOn(account, 'isFollowing', auth => {
      return Promise.resolve(auth.account.id === other)
    })
    let unfollows = spyOn(account, 'unfollow', () => Promise.resolve())
    let popup = await openSavedAuthor()

    let removing = popup.remove()
    equal(popup.deleting.get(), true)
    await removing
    equal(popup.deleting.get(), false)
    deepEqual(
      unfollows.calls.map(call => [call[0].account.id, call[1]]),
      [
        [accountId, AUTHOR],
        [other, AUTHOR]
      ]
    )
    deepEqual(
      checks.calls.map(call => call[0].account.id).toSorted(),
      [notFollowing, other].toSorted()
    )
    deepEqual(await loadFeeds(), [])
    deepEqual(await loadPosts(), [])
  })

  test('unsubscribes followed author', async () => {
    spyPosts()
    let accountId = await addAccount(testAccount())
    await addPost([
      authorPost(accountId, '1'),
      testPost({
        accountId,
        author: { title: 'Other', url: 'https://a.social/@other' },
        feedId: null,
        originId: '2'
      })
    ])
    spyOn(account, 'isFollowing', () => Promise.resolve(true))
    spyOn(account, 'unfollow', () => Promise.resolve())
    let popup = await openAuthor()

    await popup.remove()
    equal(popup.followedBy.get(), undefined)
    deepEqual(
      (await loadPosts()).map(i => i.originId),
      ['2']
    )
  })
})
