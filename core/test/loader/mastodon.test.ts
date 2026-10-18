import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  createDownloadTask,
  createTextResponse,
  loaders,
  ParseError,
  type ParsedPost,
  setupEnvironment,
  testFeed
} from '../../index.ts'
import {
  checkAndRemoveRequestMock,
  expectNotMine,
  expectRequest,
  getTestEnvironment,
  loadedPostsValue,
  mockRequest,
  setupNodeDom
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

function profile(
  url: string,
  html = PROFILE
): ReturnType<typeof createTextResponse> {
  return createTextResponse(html, { url })
}

function account(name: string, fields: object = {}): Record<string, unknown> {
  return {
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

  test('detects own URLs', () => {
    let { mastodon } = loaders
    equal(mastodon.isMineUrl(new URL('https://mastodon.social/@jane')), 'jane')
    equal(
      mastodon.isMineUrl(new URL('https://mastodon.social/@jane/1')),
      undefined
    )
    equal(mastodon.isMineUrl(new URL('https://example.com/@jane')), undefined)
    equal(mastodon.isMineUrl(new URL('https://example.com/feed')), false)
  })

  test('detects profiles', () => {
    let { mastodon } = loaders
    equal(
      mastodon.isMineText(profile('https://mastodon.social/@jane')),
      'Jane Doe'
    )
    equal(
      mastodon.isMineText(
        profile(
          'https://mastodon.social/@bob@other.social/',
          '<!DOCTYPE html><html><head><link rel="alternate" ' +
            'type="application/activity+json" href="/users/bob">' +
            '</head></html>'
        )
      ),
      'bob@other.social'
    )
    equal(
      mastodon.isMineText(
        profile('https://mastodon.social/@jane', '<!DOCTYPE html><html></html>')
      ),
      'jane'
    )
    equal(mastodon.isMineText(profile('https://example.com/@jane')), 'Jane Doe')
    expectNotMine(mastodon, profile('https://mastodon.social/@jane/1'))
    expectNotMine(mastodon, profile('https://mastodon.social/about'))
    expectNotMine(
      mastodon,
      profile('https://example.com/@jane', '<!DOCTYPE html><html></html>')
    )
    expectNotMine(
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

  test('finds avatar', async () => {
    let task = createDownloadTask()
    equal(
      await loaders.mastodon.getAvatar(
        profile('https://mastodon.social/@jane'),
        task,
        'https://mastodon.social/@jane'
      ),
      'https://mastodon.social/avatar.png'
    )

    expectRequest(`${API}/accounts/lookup?acct=bob%40other.social`).andRespond(
      200,
      JSON.stringify(account('bob')),
      'application/json'
    )
    equal(
      await loaders.mastodon.getAvatar(
        profile('https://mastodon.social/redirect/accounts/1'),
        task,
        'https://mastodon.social/@bob@other.social'
      ),
      'https://mastodon.social/bob.png'
    )
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
      loaders.mastodon.getSupersededLinksFromText!(
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
              description: 'Cat',
              meta: { original: { height: 10, width: 20 } },
              preview_url: 'https://mastodon.social/small.png',
              remote_url: null,
              type: 'image',
              url: 'https://mastodon.social/cat.png'
            },
            {
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
          poll: { id: '1' },
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
          publishedAt: 1767225600,
          unsupported: true,
          url: 'https://mastodon.social/@jane/2'
        },
        {
          author: { title: 'BOB', url: 'https://mastodon.social/@bob' },
          full: '<p>original</p>',
          originId: '3',
          publishedAt: 1767398400,
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
          updatedAt: undefined,
          url: 'https://mastodon.social/@jane/original'
        },
        {
          full: '<p>Text</p>',
          originId: '4',
          publishedAt: 1767225600,
          quoted: { missing: true },
          url: 'https://mastodon.social/@jane/4'
        }
      ]
    })

    expectRequest(
      `${API}/accounts/jane-id/statuses?exclude_replies=true&max_id=4`
    ).andRespond(200, '[]', 'application/json')
    await posts.next()
    deepEqual(posts.get().list, [])
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

    equal(
      loaders.mastodon.isMineText(
        profile(
          'https://mastodon.social/@jane',
          PROFILE.replace('Jane Doe (', 'Jane :verified: Doe (')
        )
      ),
      'Jane Doe'
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
            in_reply_to_id: 'parent'
          })
        }),
        status('4', {
          reblog: status('r2', {
            account: account('bob'),
            in_reply_to_account_id: 'alice-id',
            in_reply_to_id: 'deleted'
          })
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

  test('loads post by URL', async () => {
    let { mastodon } = loaders
    equal(mastodon.isPostUrl!(new URL('https://other.social/@jane/1')), true)
    equal(mastodon.isPostUrl!(new URL('https://other.social/@jane')), false)
    equal(mastodon.isPostUrl!(new URL('https://other.social/notes/1')), false)

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
