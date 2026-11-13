import { deepEqual, equal, rejects } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  type AccountAuth,
  createDownloadTask,
  createTextResponse,
  type Loader,
  loaders,
  NotFoundError,
  ParseError,
  type DetectedFeed,
  type ParsedPost,
  setupEnvironment,
  testAccount,
  testFeed
} from '../../index.ts'
import {
  checkAndRemoveRequestMock,
  expectNotMine,
  expectRequest,
  getTestEnvironment,
  loadedPostsValue,
  mockRequest,
  setupNodeDom,
  throws
} from '../utils.ts'

setupNodeDom()

const PROFILE =
  '<!DOCTYPE html><html><head>' +
  '<link href="https://mastodon.social/@jane.rss" rel="alternate" ' +
  'type="application/rss+xml">' +
  '<link href="https://mastodon.social/users/jane" rel="alternate" ' +
  'type="application/activity+json">' +
  '<meta content="Jane Doe (@jane@mastodon.social)" property="og:title">' +
  '<meta content="/avatar.png" property="og:image">' +
  '</head></html>'

const API = 'https://mastodon.social/api/v1'

const NEWS = { title: '#News', url: 'https://mastodon.social/tags/news' }

function profile(
  url: string,
  html = PROFILE
): ReturnType<typeof createTextResponse> {
  return createTextResponse(html, { url })
}

function account(name: string, fields: object = {}): Record<string, unknown> {
  return {
    acct: name,
    avatar: `https://mastodon.social/${name}.png`,
    display_name: name.toUpperCase(),
    id: `${name}-id`,
    url: `https://mastodon.social/@${name}`,
    username: name,
    ...fields
  }
}

function status(id: string, fields: object = {}): Record<string, unknown> {
  return {
    account: account('jane'),
    card: null,
    content: `<p>${id}</p>`,
    created_at: '2026-01-01T00:00:00.000Z',
    edited_at: null,
    id,
    media_attachments: [],
    poll: null,
    quote: null,
    reblog: null,
    sensitive: false,
    spoiler_text: '',
    uri: `https://mastodon.social/users/jane/statuses/${id}`,
    url: `https://mastodon.social/@jane/${id}`,
    ...fields
  }
}

describe('mastodon loader', () => {
  setupEnvironment(getTestEnvironment())

  beforeEach(() => {
    mockRequest()
  })

  afterEach(() => {
    checkAndRemoveRequestMock()
  })

  test('detects own URLs', async () => {
    let { mastodon } = loaders
    let task = createDownloadTask()
    function isMine(url: string): ReturnType<typeof mastodon.isMineUrl> {
      return mastodon.isMineUrl(task, new URL(url))
    }
    equal(isMine('https://mastodon.social/@jane/1'), undefined)
    equal(isMine('https://example.com/@jane'), undefined)
    equal(isMine('https://example.com/users/jane'), undefined)
    equal(isMine('https://example.com/feed'), false)

    for (let url of [
      'https://mastodon.social/@jane',
      'https://mastodon.social/users/jane'
    ]) {
      expectRequest(`${API}/accounts/lookup?acct=jane`).andRespond(
        200,
        JSON.stringify(account('jane', { display_name: 'Jane Doe' })),
        'application/json'
      )
      deepEqual(await isMine(url), {
        title: 'Jane Doe',
        url: 'https://mastodon.social/@jane'
      })
    }
  })

  test('detects profiles', async () => {
    let { mastodon } = loaders
    let task = createDownloadTask()
    async function detect(
      url: string,
      html?: string,
      requested = url
    ): Promise<false | DetectedFeed> {
      return mastodon.detectFeedInPage(task, profile(url, html), requested)
    }

    deepEqual(await detect('https://mastodon.social/@jane'), {
      title: 'Jane Doe',
      url: 'https://mastodon.social/@jane'
    })
    deepEqual(await detect('https://mastodon.social/@Jane/'), {
      title: 'Jane Doe',
      url: 'https://mastodon.social/@jane'
    })
    expectRequest(`${API}/accounts/lookup?acct=Jane`).andRespond(
      200,
      JSON.stringify(account('jane', { display_name: 'Jane Doe' })),
      'application/json'
    )
    deepEqual(
      await mastodon.isMineUrl(task, new URL('https://mastodon.social/@Jane/')),
      await detect('https://mastodon.social/@Jane/')
    )
    deepEqual(await detect('https://example.com/@jane'), {
      title: 'Jane Doe',
      url: 'https://example.com/@jane@mastodon.social'
    })
    deepEqual(
      await detect(
        'https://fedi.example.com/@jane/',
        PROFILE.replace(
          '<meta content="/avatar.png"',
          '<meta content="https://fedi.example.com/@jane" property="og:url">' +
            '<meta content="/avatar.png"'
        ).replace('@jane@mastodon.social', '@jane@example.com')
      ),
      { title: 'Jane Doe', url: 'https://fedi.example.com/@jane' }
    )
    for (let canonical of [
      'not a url',
      'https://example.com/about',
      'https://other.example.com/@jane'
    ]) {
      deepEqual(
        await detect(
          'https://example.com/@jane',
          PROFILE.replace(
            '<meta content="/avatar.png"',
            `<meta content="${canonical}" property="og:url">` +
              '<meta content="/avatar.png"'
          )
        ),
        { title: 'Jane Doe', url: 'https://example.com/@jane@mastodon.social' }
      )
    }

    expectRequest(
      `${API}/accounts/lookup?acct=${encodeURIComponent('bob@other.social')}`
    ).andRespond(
      200,
      JSON.stringify(
        account('bob', { acct: 'bob@other.social', display_name: ':blob: Bob' })
      ),
      'application/json'
    )
    deepEqual(
      await detect(
        'https://mastodon.social/redirect/accounts/1',
        PROFILE,
        'https://mastodon.social/@bob@other.social/'
      ),
      { title: 'Bob', url: 'https://mastodon.social/@bob@other.social' }
    )

    expectRequest(`${API}/accounts/lookup?acct=jane`).andRespond(
      200,
      JSON.stringify(account('jane', { display_name: '' })),
      'application/json'
    )
    deepEqual(
      await detect(
        'https://mastodon.social/@jane',
        '<!DOCTYPE html><html></html>'
      ),
      { title: 'jane', url: 'https://mastodon.social/@jane' }
    )

    expectRequest(`${API}/accounts/lookup?acct=jane`).andRespond(404)
    deepEqual(
      await detect(
        'https://mastodon.social/@jane',
        '<!DOCTYPE html><html></html>'
      ),
      { title: 'jane', url: 'https://mastodon.social/@jane' }
    )

    deepEqual(
      await detect(
        'https://mastodon.social/@jane',
        PROFILE.replace('Jane Doe (', ':blob: (')
      ),
      { title: 'jane', url: 'https://mastodon.social/@jane' }
    )

    expectRequest(
      'https://pleroma.example.com/api/v1/accounts/lookup?acct=jane'
    ).andRespond(
      200,
      JSON.stringify(account('jane', { display_name: 'Jane Doe' })),
      'application/json'
    )
    deepEqual(
      await detect(
        'https://pleroma.example.com/users/jane',
        '<!DOCTYPE html><html></html>'
      ),
      { title: 'Jane Doe', url: 'https://pleroma.example.com/@jane' }
    )

    expectRequest(
      'https://pleroma.example.com/api/v1/accounts/lookup?acct=jane'
    ).andRespond(
      200,
      JSON.stringify(account('jane', { display_name: 'Jane Doe' })),
      'application/json'
    )
    deepEqual(
      await detect(
        'https://pleroma.example.com/@jane',
        '<!DOCTYPE html><html></html>'
      ),
      { title: 'Jane Doe', url: 'https://pleroma.example.com/@jane' }
    )

    expectRequest(
      'https://example.com/api/v1/accounts/lookup?acct=jane'
    ).andRespond(404)
    equal(
      await detect('https://example.com/users/jane', '<!DOCTYPE html></html>'),
      false
    )

    await expectNotMine(mastodon, profile('https://mastodon.social/@jane/1'))
    await expectNotMine(mastodon, profile('https://mastodon.social/about'))
    expectRequest(
      'https://example.com/api/v1/accounts/lookup?acct=jane'
    ).andRespond(404)
    await expectNotMine(
      mastodon,
      profile('https://example.com/@jane', '<!DOCTYPE html><html></html>')
    )
    await expectNotMine(
      mastodon,
      createTextResponse('<rss></rss>', { url: 'https://example.com/@jane' })
    )
  })

  test('finds profile by handle', async () => {
    let { mastodon } = loaders
    let task = createDownloadTask()
    deepEqual(await mastodon.getProfilesByHandle!(task, '@jane'), [])
    deepEqual(
      await mastodon.getProfilesByHandle!(task, '@jane.bsky.social'),
      []
    )

    expectRequest(
      'https://example.com/.well-known/webfinger?resource=acct%3Ajane%40example.com'
    ).andRespond(
      200,
      JSON.stringify({
        links: [
          { href: 'https://example.com/users/jane', rel: 'self' },
          {
            href: 'https://social.example.com/@jane',
            rel: 'http://webfinger.net/rel/profile-page'
          }
        ]
      }),
      'application/jrd+json'
    )
    deepEqual(await mastodon.getProfilesByHandle!(task, '@jane@example.com'), [
      'https://social.example.com/@jane'
    ])

    expectRequest(
      'https://example.com/.well-known/webfinger?resource=acct%3Ajohn%40example.com'
    ).andRespond(404)
    deepEqual(await mastodon.getProfilesByHandle!(task, '@john@example.com'), [
      'https://example.com/@john'
    ])
  })

  test('loads feed data', async () => {
    let task = createDownloadTask()
    expectRequest(`${API}/accounts/lookup?acct=bob%40other.social`).andRespond(
      200,
      JSON.stringify(account('bob', { avatar: '' })),
      'application/json'
    )
    deepEqual(
      await loaders.mastodon.loadFeedData(
        task,
        'https://mastodon.social/@bob@other.social'
      ),
      {
        avatar: undefined,
        handle: '@bob@mastodon.social',
        title: 'BOB',
        url: 'https://mastodon.social/@bob'
      }
    )
  })

  test('finds new account of moved author', async () => {
    let task = createDownloadTask()
    let { getMovedTo } = loaders.mastodon as Required<Loader>
    function lookup(origin: string, body: object): void {
      expectRequest(`${origin}/api/v1/accounts/lookup?acct=ann`).andRespond(
        200,
        JSON.stringify(body),
        'application/json'
      )
    }
    let second = {
      ...account('ann'),
      id: 'ann-2',
      url: 'https://two.social/@ann'
    }
    let third = {
      ...account('ann'),
      avatar: '',
      display_name: 'Ann',
      id: 'ann-3',
      url: 'https://three.social/@ann'
    }

    lookup('https://mastodon.social', account('ann', { moved: second }))
    deepEqual(
      await loaders.mastodon.loadFeedData(task, 'https://mastodon.social/@ann'),
      {
        avatar: 'https://mastodon.social/ann.png',
        handle: '@ann@mastodon.social',
        moved: true,
        title: 'ANN',
        url: 'https://mastodon.social/@ann'
      }
    )

    lookup('https://mastodon.social', account('ann', { moved: second }))
    lookup('https://two.social', { ...second, moved: third })
    lookup('https://three.social', { ...third, moved: null })
    deepEqual(await getMovedTo('https://mastodon.social/@ann'), {
      avatar: undefined,
      handle: '@ann@three.social',
      loaderData: '{"id":"ann-3"}',
      title: 'Ann',
      url: 'https://three.social/@ann'
    })

    lookup('https://mastodon.social', account('ann'))
    equal(await getMovedTo('https://mastodon.social/@ann'), undefined)

    lookup(
      'https://mastodon.social',
      account('ann', { moved: { ...second, url: 'https://two.social/' } })
    )
    equal(await getMovedTo('https://mastodon.social/@ann'), undefined)

    let loop = account('ann', { moved: account('ann') })
    for (let i = 0; i < 6; i++) lookup('https://mastodon.social', loop)
    equal(await getMovedTo('https://mastodon.social/@ann'), undefined)

    equal(await getMovedTo(NEWS.url), undefined)
  })

  test('finds profile from post', () => {
    deepEqual(
      loaders.mastodon.getMineLinksFromText(
        profile('https://mastodon.social/@jane/123')
      ),
      ['https://mastodon.social/@jane']
    )
    deepEqual(
      loaders.mastodon.getMineLinksFromText(
        profile('https://example.com/@jane/123')
      ),
      ['https://example.com/@jane']
    )
    deepEqual(
      loaders.mastodon.getMineLinksFromText(
        profile('https://example.com/@jane/123', '<!DOCTYPE html><html></html>')
      ),
      []
    )
    deepEqual(
      loaders.mastodon.getMineLinksFromText(
        profile('https://mastodon.social/@jane')
      ),
      []
    )
    deepEqual(
      loaders.mastodon.getWorseLinksFromText!(
        profile('https://mastodon.social/@jane')
      ),
      ['https://mastodon.social/@jane.rss']
    )
    deepEqual(
      loaders.mastodon.getSuggestedLinksFromText(
        profile('https://mastodon.social/@jane')
      ),
      []
    )
  })

  test('loads posts', async () => {
    expectRequest(`${API}/accounts/lookup?acct=jane`).andRespond(
      200,
      JSON.stringify(account('jane')),
      'application/json'
    )
    expectRequest(
      `${API}/accounts/jane-id/statuses?exclude_replies=true`
    ).andRespond(
      200,
      JSON.stringify([
        status('1', {
          card: {
            description: '',
            image: null,
            title: 'Link',
            url: 'https://example.com/'
          },
          content:
            '<p><a href="https://example.com/long"><span class="invisible">' +
            'https://</span><span class="ellipsis">example.com/lo</span>' +
            '<span class="invisible">ng</span></a></p>',
          edited_at: '2026-01-02T00:00:00.000Z',
          spoiler_text: 'Spoiler'
        }),
        status('2', {
          media_attachments: [
            {
              blurhash: '00TI:j',
              description: 'Cat',
              meta: { original: { height: 10, width: 20 } },
              preview_url: 'https://mastodon.social/small.png',
              remote_url: null,
              type: 'image',
              url: 'https://mastodon.social/cat.png'
            },
            {
              blurhash: 'broken',
              description: null,
              meta: null,
              preview_url: 'https://mastodon.social/poster.png',
              remote_url: null,
              type: 'gifv',
              url: 'https://mastodon.social/cat.mp4'
            },
            {
              description: null,
              preview_url: null,
              remote_url: 'https://other.social/song.mp3',
              type: 'audio',
              url: null
            },
            {
              description: null,
              preview_url: null,
              remote_url: null,
              type: 'unknown',
              url: 'https://mastodon.social/file'
            }
          ],
          poll: {
            emojis: [
              { shortcode: 'cat', static_url: 'https://e.social/c.png' }
            ],
            options: [{ title: 'Yes :cat:' }, { title: '<b>No</b>' }]
          },
          sensitive: true
        }),
        status('3', {
          account: account('bot', { display_name: '' }),
          created_at: '2026-01-03T00:00:00.000Z',
          reblog: status('original', {
            account: account('bob', { avatar: '' }),
            edited_at: '2026-01-02T00:00:00.000Z',
            quote: {
              quoted_status: status('quoted', {
                media_attachments: [
                  {
                    description: null,
                    meta: { original: {} },
                    preview_url: null,
                    remote_url: null,
                    type: 'image',
                    url: 'https://mastodon.social/q.png'
                  }
                ],
                quote: {
                  quoted_status: status('deep', { url: null }),
                  state: 'accepted'
                }
              }),
              state: 'accepted'
            }
          })
        }),
        status('4', {
          content: '<p class="quote-inline">RE: link</p><p>Text</p>',
          quote: { quoted_status: null, state: 'deleted' }
        }),
        status('5', {
          quote: status('sharkey', { quote: status('sharkey-deep') })
        })
      ]),
      'application/json'
    )
    let posts = loaders.mastodon.getPosts(
      createDownloadTask(),
      'https://mastodon.social/@jane',
      profile('https://mastodon.social/@jane')
    )
    deepEqual(await loadedPostsValue(posts), {
      error: undefined,
      hasNext: true,
      isLoading: false,
      list: [
        {
          full: '<p><a href="https://example.com/long"><span class="ellipsis">example.com/lo…</span></a></p>',
          originId: '1',
          preview: { title: 'Link', url: 'https://example.com/' },
          publishedAt: 1767225600,
          updatedAt: 1767312000,
          url: 'https://mastodon.social/@jane/1',
          warning: 'Spoiler'
        },
        {
          full: '<p>2</p>',
          media: [
            {
              alt: 'Cat',
              placeholder:
                'data:image/bmp;base64,Qk2WAAAAAAAAADYAAAAoAAAACAAAAAQAAAABABgA' +
                'A'.repeat(32) +
                'AAD/'.repeat(32),
              sensitive: true,
              type: 'image',
              url: 'https://mastodon.social/cat.png'
            },
            {
              poster: 'https://mastodon.social/poster.png',
              sensitive: true,
              type: 'video;mode=gif',
              url: 'https://mastodon.social/cat.mp4'
            },
            {
              sensitive: true,
              type: 'audio',
              url: 'https://other.social/song.mp3'
            }
          ],
          mediaSizes: [{ height: 10, width: 20 }, null, null],
          originId: '2',
          poll: {
            options: [
              {
                title:
                  'Yes <img class="emoji" src="https://e.social/c.png" alt=":cat:" title=":cat:">'
              },
              { title: '&lt;b&gt;No&lt;/b&gt;' }
            ]
          },
          publishedAt: 1767225600,
          url: 'https://mastodon.social/@jane/2'
        },
        {
          author: { title: 'BOB', url: 'https://mastodon.social/@bob' },
          full: '<p>original</p>',
          originId: 'original',
          publishedAt: 1767225600,
          quoted: {
            author: {
              avatar: 'https://mastodon.social/jane.png',
              title: 'JANE',
              url: 'https://mastodon.social/@jane'
            },
            full: '<p>quoted</p>',
            media: [{ type: 'image', url: 'https://mastodon.social/q.png' }],
            missing: false,
            publishedAt: 1767225600,
            quotedUrl: 'https://mastodon.social/users/jane/statuses/deep',
            url: 'https://mastodon.social/@jane/quoted'
          },
          repostedBy: {
            avatar: 'https://mastodon.social/bot.png',
            title: 'bot',
            url: 'https://mastodon.social/@bot'
          },
          sortedAt: 1767398400,
          updatedAt: 1767312000,
          url: 'https://mastodon.social/@jane/original'
        },
        {
          full: '<p>Text</p>',
          originId: '4',
          publishedAt: 1767225600,
          quoted: { missing: true },
          url: 'https://mastodon.social/@jane/4'
        },
        {
          full: '<p>5</p>',
          originId: '5',
          publishedAt: 1767225600,
          quoted: {
            author: {
              avatar: 'https://mastodon.social/jane.png',
              title: 'JANE',
              url: 'https://mastodon.social/@jane'
            },
            full: '<p>sharkey</p>',
            missing: false,
            publishedAt: 1767225600,
            quotedUrl: 'https://mastodon.social/@jane/sharkey-deep',
            url: 'https://mastodon.social/@jane/sharkey'
          },
          url: 'https://mastodon.social/@jane/5'
        }
      ]
    })

    expectRequest(
      `${API}/accounts/jane-id/statuses?exclude_replies=true&max_id=5`
    ).andRespond(200, '[]', 'application/json')
    let first = posts.get().list
    deepEqual(await posts.next(), [])
    deepEqual(posts.get().list, first)
    equal(posts.get().hasNext, false)
  })

  test('uses account ID from loader data', async () => {
    expectRequest(`${API}/accounts/lookup?acct=jane`).andRespond(
      200,
      JSON.stringify(account('jane')),
      'application/json'
    )
    equal(
      await loaders.mastodon.getLoaderData!(
        createDownloadTask(),
        'https://mastodon.social/@jane'
      ),
      '{"id":"jane-id"}'
    )

    expectRequest(
      `${API}/accounts/saved/statuses?exclude_replies=true`
    ).andRespond(200, '[]', 'application/json')
    await loaders.mastodon.getPosts(
      createDownloadTask(),
      'https://mastodon.social/@jane',
      undefined,
      undefined,
      '{"id":"saved"}'
    ).loading

    for (let broken of ['{', '{"id":1}']) {
      expectRequest(`${API}/accounts/lookup?acct=jane`).andRespond(
        200,
        JSON.stringify(account('jane')),
        'application/json'
      )
      expectRequest(
        `${API}/accounts/jane-id/statuses?exclude_replies=true`
      ).andRespond(200, '[]', 'application/json')
      await loaders.mastodon.getPosts(
        createDownloadTask(),
        'https://mastodon.social/@jane',
        undefined,
        undefined,
        broken
      ).loading
    }
  })

  test('loads hashtag feed', async () => {
    let { mastodon } = loaders
    let task = createDownloadTask()
    let url = 'https://mastodon.social/tags/News'

    expectRequest(`${API}/tags/News`).andRespond(
      200,
      JSON.stringify({ name: 'News' }),
      'application/json'
    )
    deepEqual(await mastodon.detectFeedInPage(task, profile(url), url), NEWS)

    expectRequest(`${API}/tags/News`).andRespond(404)
    equal(await mastodon.detectFeedInPage(task, profile(url), url), false)

    expectRequest(`${API}/tags/News`).andRespond(200, '[]', 'application/json')
    equal(await mastodon.detectFeedInPage(task, profile(url), url), false)

    equal(await mastodon.loadFeedData(task, url), undefined)
    equal(await mastodon.getLoaderData!(task, url), undefined)

    expectRequest(`${API}/timelines/tag/News?limit=40`).andRespond(
      200,
      JSON.stringify([
        status('1', { account: account('bob') }),
        status('2', {
          account: account('bob'),
          in_reply_to_account_id: 'alice-id',
          in_reply_to_id: 'other'
        })
      ]),
      'application/json'
    )
    let posts = mastodon.getPosts(task, url)
    await posts.loading
    deepEqual(
      posts.get().list.map(post => [post.originId, post.author?.title]),
      [['1', 'BOB']]
    )
    expectRequest(`${API}/timelines/tag/News?limit=40&max_id=2`).andRespond(
      200,
      '[]',
      'application/json'
    )
    await posts.next()
    equal(posts.get().hasNext, false)
  })

  test('adds custom emoji', async () => {
    let blob = { shortcode: 'blob', static_url: 'https://a.social/blob.png' }
    let image =
      '<img class="emoji" src="https://a.social/blob.png" ' +
      'alt=":blob:" title=":blob:">'
    expectRequest(
      `${API}/accounts/saved/statuses?exclude_replies=true`
    ).andRespond(
      200,
      JSON.stringify([
        status('1', {
          account: account('jane', {
            display_name: 'Jane :verified: :blob:',
            emojis: [blob]
          }),
          content:
            '<p>Hi :blob: :unknown: <a href="https://a.social/">:blob:</a></p>',
          emojis: [blob],
          reblog: status('2', {
            account: account('bob', { display_name: ':verified:' }),
            content: '<p>:blob:</p>',
            emojis: [blob],
            spoiler_text: 'Tom & :blob:'
          })
        })
      ]),
      'application/json'
    )
    let posts = loaders.mastodon.getPosts(
      createDownloadTask(),
      'https://mastodon.social/@jane',
      undefined,
      undefined,
      '{"id":"saved"}'
    )
    let { list } = (await loadedPostsValue(posts)) as { list: ParsedPost[] }
    let post = list[0]!
    equal(post.full, `<p>${image}</p>`)
    equal(post.warning, `Tom &amp; ${image}`)
    equal(post.author?.title, 'bob')
    equal(post.repostedBy?.title, 'Jane')

    expectRequest(
      `${API}/accounts/saved/statuses?exclude_replies=true`
    ).andRespond(
      200,
      JSON.stringify([
        status('3', {
          content:
            '<p>Hi :blob: :unknown: <a href="https://a.social/">:blob:</a></p>',
          emojis: [blob]
        })
      ]),
      'application/json'
    )
    let text = loaders.mastodon.getPosts(
      createDownloadTask(),
      'https://mastodon.social/@jane',
      undefined,
      undefined,
      '{"id":"saved"}'
    )
    let { list: other } = (await loadedPostsValue(text)) as {
      list: ParsedPost[]
    }
    equal(
      other[0]!.full,
      `<p>Hi ${image} :unknown: <a href="https://a.social/">:blob:</a></p>`
    )

    deepEqual(
      await loaders.mastodon.detectFeedInPage(
        createDownloadTask(),
        profile(
          'https://mastodon.social/@jane',
          PROFILE.replace('Jane Doe (', 'Jane :verified: Doe (')
        ),
        'https://mastodon.social/@jane'
      ),
      { title: 'Jane Doe', url: 'https://mastodon.social/@jane' }
    )
  })

  test('validates API answers', async () => {
    expectRequest(`${API}/accounts/lookup?acct=jane`).andRespond(
      200,
      '{}',
      'application/json'
    )
    let posts = loaders.mastodon.getPosts(
      createDownloadTask(),
      'https://mastodon.social/@jane'
    )
    await posts.loading
    equal(posts.get().error instanceof ParseError, true)

    expectRequest(`${API}/accounts/lookup?acct=jane`).andRespond(
      200,
      JSON.stringify(account('jane')),
      'application/json'
    )
    expectRequest(
      `${API}/accounts/jane-id/statuses?exclude_replies=true`
    ).andRespond(200, '{}', 'application/json')
    posts = loaders.mastodon.getPosts(
      createDownloadTask(),
      'https://mastodon.social/@jane'
    )
    await posts.loading
    equal(posts.get().error instanceof ParseError, true)
  })

  test('links threads and loads replied posts', async () => {
    expectRequest(`${API}/accounts/lookup?acct=jane`).andRespond(
      200,
      JSON.stringify(account('jane')),
      'application/json'
    )
    expectRequest(
      `${API}/accounts/jane-id/statuses?exclude_replies=true`
    ).andRespond(
      200,
      JSON.stringify([
        status('2', {
          in_reply_to_account_id: 'jane-id',
          in_reply_to_id: '1'
        }),
        status('3', {
          account: account('jane'),
          reblog: status('r', {
            account: account('bob'),
            in_reply_to_account_id: 'alice-id',
            in_reply_to_id: 'parent',
            replies_count: 1
          })
        }),
        status('4', {
          reblog: status('r2', {
            account: account('bob'),
            in_reply_to_account_id: 'alice-id',
            in_reply_to_id: 'deleted'
          })
        }),
        status('6', {
          reblog: status('thread', {
            account: account('bob'),
            replies_count: 2
          })
        }),
        status('7', {
          reblog: status('part', {
            account: account('bob'),
            in_reply_to_account_id: 'bob-id',
            in_reply_to_id: 'previous'
          })
        }),
        status('8', {
          quote: {
            quoted_status: status('middle', {
              account: account('bob'),
              in_reply_to_account_id: 'bob-id',
              in_reply_to_id: 'm2'
            }),
            state: 'accepted'
          }
        }),
        status('9', {
          quote: {
            quoted_status: status('missing', {
              in_reply_to_account_id: 'jane-id',
              in_reply_to_id: 'm2'
            }),
            state: 'accepted'
          }
        })
      ]),
      'application/json'
    )
    expectRequest(`${API}/statuses/parent`).andRespond(
      200,
      JSON.stringify(status('parent', { account: account('alice') })),
      'application/json'
    )
    expectRequest(`${API}/statuses/deleted`).andRespond(404)
    expectRequest(`${API}/statuses/middle/context`).andRespond(
      200,
      JSON.stringify({
        ancestors: [
          status('m1', { account: account('bob') }),
          status('m2', {
            account: account('bob'),
            in_reply_to_account_id: 'bob-id',
            in_reply_to_id: 'm1'
          })
        ],
        descendants: [
          status('m4', {
            account: account('bob'),
            in_reply_to_account_id: 'bob-id',
            in_reply_to_id: 'middle'
          }),
          status('reply', { in_reply_to_id: 'middle' })
        ]
      }),
      'application/json'
    )
    expectRequest(`${API}/statuses/missing/context`).andRespond(404)
    let posts = loaders.mastodon.getPosts(
      createDownloadTask(),
      'https://mastodon.social/@jane'
    )
    await posts.loading
    let list = posts.get().list
    equal(list[0]!.selfReplyTo, '1')
    equal(list[1]!.selfReplyTo, undefined)
    deepEqual(list[1]!.replied, {
      author: {
        avatar: 'https://mastodon.social/alice.png',
        title: 'ALICE',
        url: 'https://mastodon.social/@alice'
      },
      full: '<p>parent</p>',
      missing: false,
      publishedAt: 1767225600,
      url: 'https://mastodon.social/@jane/parent'
    })
    deepEqual(list[2]!.replied, { missing: true })
    deepEqual(
      list.map(i => [i.hasReplies, i.repostedPart, i.replied?.missing]),
      [
        [undefined, undefined, undefined],
        [undefined, undefined, false],
        [undefined, undefined, true],
        [true, undefined, undefined],
        [undefined, true, undefined],
        [undefined, undefined, undefined],
        [undefined, undefined, undefined]
      ]
    )
    deepEqual(list[5]!.quoted?.signals, { threadPosition: 3, threadSize: 4 })
    equal(list[6]!.quoted?.missing, false)
    equal(list[6]!.quoted?.signals, undefined)

    expectRequest(`${API}/accounts/lookup?acct=jane`).andRespond(
      200,
      JSON.stringify(account('jane')),
      'application/json'
    )
    expectRequest(
      `${API}/accounts/jane-id/statuses?exclude_replies=true`
    ).andRespond(
      200,
      JSON.stringify([
        status('5', {
          reblog: status('r3', { in_reply_to_id: 'broken' })
        })
      ]),
      'application/json'
    )
    expectRequest(`${API}/statuses/broken`).andRespond(500)
    posts = loaders.mastodon.getPosts(
      createDownloadTask({ tries: 1 }),
      'https://mastodon.social/@jane'
    )
    await posts.loading
    equal(posts.get().error?.name, 'HTTPStatusError')
  })

  test('takes hidden author from post URL', async () => {
    expectRequest(`${API}/accounts/lookup?acct=jane`).andRespond(
      200,
      JSON.stringify(account('jane')),
      'application/json'
    )
    expectRequest(
      `${API}/accounts/jane-id/statuses?exclude_replies=true`
    ).andRespond(
      200,
      JSON.stringify([
        status('1', {
          reblog: status('mastodon', {
            account: {},
            url: 'https://other.social/@eloy/1'
          })
        }),
        status('2', {
          reblog: status('old', {
            account: {},
            uri: 'https://other.social/users/eloy/statuses/2',
            url: null
          })
        }),
        status('3', {
          reblog: status('pleroma', {
            account: {},
            url: 'https://other.social/objects/ebee64b3-9bc9-4a16-853a-8d8b571fe5ac'
          })
        })
      ]),
      'application/json'
    )
    let posts = loaders.mastodon.getPosts(
      createDownloadTask(),
      'https://mastodon.social/@jane'
    )
    await posts.loading
    deepEqual(
      posts.get().list.map(post => [post.author, post.repostedBy?.title]),
      [
        [{ title: 'eloy', url: 'https://other.social/@eloy' }, 'JANE'],
        [{ title: 'eloy', url: 'https://other.social/@eloy' }, 'JANE'],
        [undefined, 'JANE']
      ]
    )

    expectRequest(`${API}/statuses/r/context`).andRespond(
      200,
      JSON.stringify({ ancestors: [], descendants: [] }),
      'application/json'
    )
    expectRequest(`${API}/statuses/r`).andRespond(
      200,
      JSON.stringify(status('r', { reblog: status('1', { account: {} }) })),
      'application/json'
    )
    deepEqual(
      await loaders.mastodon.getThreadDescendants!(
        createDownloadTask(),
        'https://mastodon.social/@jane',
        'r'
      ),
      []
    )
  })

  test('skips position of quoted thread part on errors', async () => {
    let quote = (id: string): Record<string, unknown> =>
      status(`q${id}`, {
        quote: {
          quoted_status: status(id, {
            in_reply_to_account_id: 'jane-id',
            in_reply_to_id: 'previous'
          }),
          state: 'accepted'
        }
      })
    expectRequest(`${API}/accounts/lookup?acct=jane`).andRespond(
      200,
      JSON.stringify(account('jane')),
      'application/json'
    )
    expectRequest(
      `${API}/accounts/jane-id/statuses?exclude_replies=true`
    ).andRespond(
      200,
      JSON.stringify([quote('broken'), quote('toOthers')]),
      'application/json'
    )
    expectRequest(`${API}/statuses/broken/context`).andRespond(
      200,
      '{}',
      'application/json'
    )
    expectRequest(`${API}/statuses/toOthers/context`).andRespond(
      200,
      JSON.stringify({
        ancestors: [
          status('previous', {
            in_reply_to_account_id: 'bob-id',
            in_reply_to_id: 'bob'
          })
        ],
        descendants: []
      }),
      'application/json'
    )
    let posts = loaders.mastodon.getPosts(
      createDownloadTask(),
      'https://mastodon.social/@jane'
    )
    await posts.loading
    deepEqual(
      posts.get().list.map(post => post.quoted?.signals),
      [undefined, undefined]
    )

    expectRequest(`${API}/accounts/lookup?acct=jane`).andRespond(
      200,
      JSON.stringify(account('jane')),
      'application/json'
    )
    expectRequest(
      `${API}/accounts/jane-id/statuses?exclude_replies=true`
    ).andRespond(200, JSON.stringify([quote('offline')]), 'application/json')
    expectRequest(`${API}/statuses/offline/context`).andFail()
    posts = loaders.mastodon.getPosts(
      createDownloadTask({ tries: 1 }),
      'https://mastodon.social/@jane'
    )
    await posts.loading
    equal(posts.get().error?.name, 'NetworkError')
  })

  test('finds earlier posts of the thread', async () => {
    let { mastodon } = loaders
    let feed = 'https://mastodon.social/@jane'
    expectRequest(`${API}/statuses/3/context`).andRespond(
      200,
      JSON.stringify({
        ancestors: [
          status('0', { account: account('bob') }),
          status('1', { account: account('jane') }),
          status('2', { account: account('jane'), in_reply_to_id: '1' })
        ],
        descendants: []
      }),
      'application/json'
    )
    deepEqual(
      (await mastodon.getThreadAncestors!(createDownloadTask(), feed, '3')).map(
        post => post.originId
      ),
      ['1', '2']
    )

    expectRequest(`${API}/statuses/5/context`).andRespond(
      200,
      JSON.stringify({
        ancestors: [
          status('3', { account: account('bob') }),
          status('4', { account: account('jane'), in_reply_to_id: '3' })
        ]
      }),
      'application/json'
    )
    deepEqual(
      await mastodon.getThreadAncestors!(createDownloadTask(), feed, '5'),
      []
    )

    expectRequest(`${API}/statuses/6/context`).andRespond(
      200,
      JSON.stringify({ ancestors: [] }),
      'application/json'
    )
    deepEqual(
      await mastodon.getThreadAncestors!(createDownloadTask(), feed, '6'),
      []
    )

    expectRequest(`${API}/statuses/7/context`).andRespond(
      200,
      '{}',
      'application/json'
    )
    let error: unknown
    try {
      await mastodon.getThreadAncestors!(createDownloadTask(), feed, '7')
    } catch (e) {
      error = e
    }
    equal(error instanceof ParseError, true)
  })

  test('finds next posts of the thread', async () => {
    let { mastodon } = loaders
    let feed = 'https://mastodon.social/@jane'
    let bob = account('bob')
    expectRequest(`${API}/statuses/r/context`).andRespond(
      200,
      JSON.stringify({ ancestors: [], descendants: [] }),
      'application/json'
    )
    expectRequest(`${API}/statuses/r`).andRespond(
      200,
      JSON.stringify(status('r', { reblog: status('1', { account: bob }) })),
      'application/json'
    )
    expectRequest(`${API}/statuses/1/context`).andRespond(
      200,
      JSON.stringify({
        ancestors: [],
        descendants: [
          status('2', { account: bob, in_reply_to_id: '1' }),
          status('3', { in_reply_to_id: '2' }),
          status('5', {
            account: bob,
            created_at: '2026-01-03T00:00:00.000Z',
            in_reply_to_id: '2'
          }),
          status('4', {
            account: bob,
            created_at: '2026-01-02T00:00:00.000Z',
            in_reply_to_id: '2'
          })
        ]
      }),
      'application/json'
    )
    deepEqual(
      (
        await mastodon.getThreadDescendants!(createDownloadTask(), feed, 'r')
      ).map(post => [post.originId, post.author?.title]),
      [
        ['2', 'BOB'],
        ['4', 'BOB']
      ]
    )

    expectRequest(`${API}/statuses/6/context`).andRespond(
      200,
      JSON.stringify({
        descendants: [
          status('7', {
            in_reply_to_account_id: 'jane-id',
            in_reply_to_id: '6'
          }),
          status('8', {
            account: bob,
            in_reply_to_account_id: 'jane-id',
            in_reply_to_id: '6'
          })
        ]
      }),
      'application/json'
    )
    deepEqual(
      await mastodon.getThreadDescendants!(
        createDownloadTask(),
        'https://mastodon.social/@jane/6',
        '6'
      ),
      [
        {
          full: '<p>7</p>',
          originId: '7',
          publishedAt: 1767225600,
          selfReplyTo: '6',
          url: 'https://mastodon.social/@jane/7'
        }
      ]
    )

    expectRequest(`${API}/statuses/9/context`).andRespond(
      200,
      JSON.stringify({ descendants: [] }),
      'application/json'
    )
    expectRequest(`${API}/statuses/9`).andRespond(
      200,
      JSON.stringify(status('9')),
      'application/json'
    )
    deepEqual(
      await mastodon.getThreadDescendants!(createDownloadTask(), feed, '9'),
      []
    )

    expectRequest(`${API}/statuses/10/context`).andRespond(
      200,
      '{}',
      'application/json'
    )
    let error: unknown
    try {
      await mastodon.getThreadDescendants!(createDownloadTask(), feed, '10')
    } catch (e) {
      error = e
    }
    equal(error instanceof ParseError, true)
  })

  test('loads post by URL', async () => {
    let { mastodon } = loaders
    equal(mastodon.isPostUrl!(new URL('https://other.social/@jane/1')), true)
    equal(mastodon.isPostUrl!(new URL('https://other.social/@jane')), false)
    equal(mastodon.isPostUrl!(new URL('https://other.social/notes/1')), false)
    equal(mastodon.isPostUrl!(new URL('https://other.social/notice/Ab1')), true)
    equal(
      mastodon.isPostUrl!(
        new URL(
          'https://other.social/objects/ebee64b3-9bc9-4a16-853a-8d8b571fe5ac'
        )
      ),
      true
    )
    equal(mastodon.isPostUrl!(new URL('https://other.social/objects/1')), false)
    equal(mastodon.isProfileUrl!(new URL('https://other.social/@jane')), true)
    equal(
      mastodon.isProfileUrl!(new URL('https://other.social/@jane/1')),
      false
    )
    equal(
      mastodon.getHandleFromUrl!(new URL('https://mastodon.social/@jane/')),
      '@jane@mastodon.social'
    )
    equal(
      mastodon.getHandleFromUrl!(new URL('https://mastodon.social/@jane/1')),
      undefined
    )
    equal(
      mastodon.getHandleFromUrl!(new URL('https://chaos.social/@jane')),
      '@jane@chaos.social'
    )

    expectRequest('https://other.social/api/v1/statuses/1').andRespond(
      200,
      JSON.stringify(status('1')),
      'application/json'
    )
    deepEqual(
      await mastodon.getPostByUrl!(
        createDownloadTask(),
        'https://other.social/@jane/1'
      ),
      {
        author: {
          avatar: 'https://mastodon.social/jane.png',
          title: 'JANE',
          url: 'https://mastodon.social/@jane'
        },
        full: '<p>1</p>',
        id: 'https://other.social/@jane/1',
        originId: '1',
        publishedAt: 1767225600,
        url: 'https://mastodon.social/@jane/1'
      }
    )

    expectRequest('https://other.social/api/v1/statuses/Ab1').andRespond(
      200,
      JSON.stringify(status('Ab1')),
      'application/json'
    )
    equal(
      (
        await mastodon.getPostByUrl!(
          createDownloadTask(),
          'https://other.social/notice/Ab1'
        )
      ).originId,
      'Ab1'
    )

    let object =
      'https://other.social/objects/ebee64b3-9bc9-4a16-853a-8d8b571fe5ac'
    let task = createDownloadTask()
    let request = task.request.bind(task)
    task.request = async (url, ...args) => {
      let response = await request(url, ...args)
      if (url !== object) return response
      let moved = new Response('')
      Object.defineProperty(moved, 'url', {
        value: 'https://other.social/notice/Ab2'
      })
      return moved
    }
    expectRequest(object).andRespond(200)
    expectRequest('https://other.social/api/v1/statuses/Ab2').andRespond(
      200,
      JSON.stringify(status('Ab2')),
      'application/json'
    )
    let redirected = await mastodon.getPostByUrl!(task, object)
    equal(redirected.id, object)
    equal(redirected.originId, 'Ab2')

    expectRequest(object).andRespond(200)
    await rejects(
      mastodon.getPostByUrl!(createDownloadTask(), object),
      ParseError
    )

    expectRequest('https://other.social/api/v1/statuses/2').andRespond(
      200,
      '{}',
      'application/json'
    )
    let error: unknown
    try {
      await mastodon.getPostByUrl!(
        createDownloadTask(),
        'https://other.social/@jane/2'
      )
    } catch (e) {
      error = e
    }
    equal(error instanceof ParseError, true)
  })

  test('returns post source', async () => {
    expectRequest(`${API}/statuses/1`).andRespond(
      200,
      JSON.stringify(status('1')),
      'application/json'
    )
    deepEqual(
      await loaders.mastodon.getPostSource(
        testFeed({ url: 'https://mastodon.social/@jane' }),
        '1'
      ),
      status('1')
    )
  })
})

const SEARCH =
  `${API.replace('v1', 'v2')}/search?q=` +
  encodeURIComponent('https://other.social/@bob') +
  '&resolve=true&type=accounts&limit=1'

describe('mastodon account', () => {
  setupEnvironment(getTestEnvironment())

  beforeEach(() => {
    mockRequest()
  })

  afterEach(() => {
    checkAndRemoveRequestMock()
  })

  let auth: AccountAuth = {
    device: undefined,
    account: testAccount({
      credentials: {
        accessToken: 'token',
        clientId: 'client',
        clientSecret: 'secret',
        dpopKey: null,
        expiresAt: null,
        refreshToken: null,
        tokenUrl: 'https://mastodon.social/oauth/token'
      }
    }),
    expire: () => Promise.resolve(),
    reload: () => Promise.resolve(undefined),
    save: () => Promise.resolve()
  }

  let signedIn = loaders.mastodon.account!

  function respond(
    url: string,
    body: unknown
  ): ReturnType<typeof expectRequest> {
    let request = expectRequest(url)
    request.andRespond(200, JSON.stringify(body), 'application/json')
    return request
  }

  function checkToken(request: ReturnType<typeof expectRequest>): void {
    equal(
      new Headers(request.sent().headers).get('Authorization'),
      'Bearer token'
    )
  }

  test('loads home timeline', async () => {
    let first = respond(`${API}/timelines/home?limit=40`, [
      status('1', { account: account('bob'), language: 'en' }),
      status('2', {
        account: account('bob'),
        in_reply_to_account_id: 'alice-id',
        in_reply_to_id: 'other'
      }),
      status('3', {
        account: account('bob'),
        in_reply_to_account_id: 'bob-id',
        in_reply_to_id: '1'
      }),
      status('4', {
        created_at: '2026-02-01T00:00:00.000Z',
        language: 'fr',
        reblog: status('5', { account: account('bob'), language: 'de' })
      }),
      status('6', { account: account('alice'), tags: [{ name: 'News' }] }),
      status('7', {
        reblog: status('8', {
          account: account('bob'),
          tags: [{ name: 'news' }]
        })
      })
    ])
    respond(`${API}/followed_tags?limit=200`, [{ name: 'News' }, {}])
    let posts = signedIn.getTimeline!(createDownloadTask(), auth)
    await posts.loading
    checkToken(first)
    deepEqual(
      posts
        .get()
        .list.map(post => [
          post.originId,
          post.author?.title,
          post.repostedBy?.title,
          post.selfReplyTo,
          post.lang,
          post.followedTag?.url
        ]),
      [
        ['1', 'BOB', undefined, undefined, 'en', undefined],
        ['3', 'BOB', undefined, '1', undefined, undefined],
        ['5', 'BOB', 'JANE', undefined, 'de', undefined],
        ['6', 'ALICE', undefined, undefined, undefined, NEWS.url],
        ['8', 'BOB', 'JANE', undefined, undefined, undefined]
      ]
    )
    equal(posts.get().hasNext, true)

    respond(`${API}/timelines/home?limit=40&max_id=7`, [])
    await posts.next()
    equal(posts.get().list.length, 5)
    equal(posts.get().hasNext, false)
  })

  test('ignores followed tags on old servers', async () => {
    respond(`${API}/timelines/home?limit=40`, [
      status('1', { account: account('bob'), tags: [{ name: 'news' }] })
    ])
    expectRequest(`${API}/followed_tags?limit=200`).andRespond(404)
    let posts = signedIn.getTimeline!(createDownloadTask(), auth)
    await posts.loading
    equal(posts.get().list[0]?.followedTag, undefined)
  })

  test('validates followed tags', async () => {
    respond(`${API}/timelines/home?limit=40`, [])
    respond(`${API}/followed_tags?limit=200`, {})
    let posts = signedIn.getTimeline!(createDownloadTask(), auth)
    await posts.loading
    equal(posts.get().error?.name, 'ParseError')
  })

  test('loads follows', async () => {
    let own = respond(`${API}/accounts/verify_credentials`, { id: 'me' })
    expectRequest(`${API}/accounts/me/following?limit=80`).andRespond(
      200,
      JSON.stringify([account('bob')]),
      'application/json',
      {
        Link:
          `<${API}/accounts/me/following?limit=80&max_id=2>; rel="next", ` +
          `<${API}/accounts/me/following?limit=80&since_id=3>; rel="prev"`
      }
    )
    respond(`${API}/accounts/me/following?limit=80&max_id=2`, [
      account('alice', { avatar: '', display_name: '' })
    ])
    expectRequest(`${API}/followed_tags?limit=200`).andRespond(
      200,
      JSON.stringify([{ name: 'News' }]),
      'application/json',
      { Link: `<${API}/followed_tags?limit=200&max_id=1>; rel="next"` }
    )
    respond(`${API}/followed_tags?limit=200&max_id=1`, [{ name: 'Пиво' }])
    deepEqual(await signedIn.getFollows(auth), [
      {
        avatar: 'https://mastodon.social/bob.png',
        title: 'BOB',
        url: 'https://mastodon.social/@bob'
      },
      { title: 'alice', url: 'https://mastodon.social/@alice' },
      NEWS,
      {
        title: '#Пиво',
        url: `https://mastodon.social/tags/${encodeURIComponent('пиво')}`
      }
    ])
    checkToken(own)

    respond(`${API}/accounts/verify_credentials`, [])
    let error = await throws(() => signedIn.getFollows(auth))
    equal(error.name, 'ParseError')

    respond(`${API}/accounts/verify_credentials`, { id: 'me' })
    respond(`${API}/accounts/me/following?limit=80`, {})
    error = await throws(() => signedIn.getFollows(auth))
    equal(error.name, 'ParseError')
  })

  test('follows and unfollows hashtags', async () => {
    let tag = respond(`${API}/tags/news`, { following: true, name: 'news' })
    equal(await signedIn.isFollowing(auth, NEWS.url), true)
    checkToken(tag)

    respond(`${API}/tags/news`, { name: 'news' })
    equal(await signedIn.isFollowing(auth, NEWS.url), false)

    let follow = respond(`${API}/tags/news/follow`, {})
    await signedIn.follow(auth, NEWS.url)
    equal(follow.sent().method, 'POST')

    let unfollow = respond(`${API}/tags/news/unfollow`, {})
    await signedIn.unfollow(auth, NEWS.url)
    equal(unfollow.sent().method, 'POST')
  })

  test('follows and unfollows authors', async () => {
    let url = 'https://other.social/@bob'

    let search = respond(SEARCH, { accounts: [{ id: 'bob-id' }] })
    respond(`${API}/accounts/relationships?id[]=bob-id`, [{ following: true }])
    equal(await signedIn.isFollowing(auth, url), true)
    checkToken(search)

    respond(SEARCH, { accounts: [{ id: 'bob-id' }] })
    respond(`${API}/accounts/relationships?id[]=bob-id`, [{ following: false }])
    equal(await signedIn.isFollowing(auth, url), false)

    respond(SEARCH, { accounts: [{ id: 'bob-id' }] })
    let follow = respond(`${API}/accounts/bob-id/follow`, {})
    await signedIn.follow(auth, url)
    equal(follow.sent().method, 'POST')
    checkToken(follow)

    respond(SEARCH, { accounts: [{ id: 'bob-id' }] })
    let unfollow = respond(`${API}/accounts/bob-id/unfollow`, {})
    await signedIn.unfollow(auth, url)
    equal(unfollow.sent().method, 'POST')
  })

  test('validates follow answers', async () => {
    let url = 'https://other.social/@bob'

    respond(SEARCH, { accounts: [] })
    let error = await throws(() => signedIn.isFollowing(auth, url))
    equal(error.name, NotFoundError.name)

    respond(SEARCH, {})
    error = await throws(() => signedIn.isFollowing(auth, url))
    equal(error.name, ParseError.name)

    respond(SEARCH, { accounts: [{ id: 'bob-id' }] })
    respond(`${API}/accounts/relationships?id[]=bob-id`, {})
    error = await throws(() => signedIn.isFollowing(auth, url))
    equal(error.name, ParseError.name)
  })

  test('does not work without credentials', async () => {
    let error = await throws(async () => {
      await signedIn.getFollows({
        ...auth,
        account: testAccount({ credentials: null })
      })
    })
    equal(error.message, 'mastodon has no credentials')
  })
})
