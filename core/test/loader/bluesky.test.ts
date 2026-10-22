import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  type AccountAuth,
  type AccountCredentials,
  accountsMessages,
  createDownloadTask,
  createTextResponse,
  type DetectedFeed,
  HTTPStatusError,
  loaders,
  ParseError,
  setupEnvironment,
  testAccount,
  testFeed
} from '../../index.ts'
import { sha256 } from '../../lib/oauth.ts'
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

const PAGE =
  '<!DOCTYPE html><html><head>' +
  '<meta property="og:url" content="https://bsky.app/profile/jane.bsky.social">' +
  '<meta property="og:title" content="Jane Doe (@jane.bsky.social)">' +
  '<link rel="alternate" type="application/rss+xml" ' +
  'href="https://bsky.app/profile/did:plc:jane/rss">' +
  '</head></html>'

const API = 'https://public.api.bsky.app/xrpc'

const FEED =
  `${API}/app.bsky.feed.getAuthorFeed?actor=` +
  `${encodeURIComponent('did:plc:jane')}&filter=posts_with_replies`

function page(url: string, html = PAGE): ReturnType<typeof createTextResponse> {
  return createTextResponse(html, { url })
}

function profile(name: string, fields: object = {}): Record<string, unknown> {
  return {
    avatar: `https://cdn.bsky.app/${name}.jpg`,
    did: `did:plc:${name}`,
    displayName: name.toUpperCase(),
    handle: `${name}.bsky.social`,
    ...fields
  }
}

function uri(name: string, id: string): string {
  return `at://did:plc:${name}/app.bsky.feed.post/${id}`
}

function post(id: string, fields: object = {}): Record<string, unknown> {
  return {
    author: profile('jane'),
    record: {
      createdAt: '2026-01-01T00:00:00.342Z',
      text: id
    },
    uri: uri('jane', id),
    ...fields
  }
}

function threadUrl(at: string, parentHeight: number, depth = 0): string {
  return (
    `${API}/app.bsky.feed.getPostThread?uri=${encodeURIComponent(at)}` +
    `&depth=${depth}&parentHeight=${parentHeight}`
  )
}

function bobPost(id: string, fields: object = {}): Record<string, unknown> {
  return post(id, { author: profile('bob'), uri: uri('bob', id), ...fields })
}

function repost(reposted: object): Record<string, unknown> {
  return {
    post: reposted,
    reason: {
      $type: 'app.bsky.feed.defs#reasonRepost',
      by: profile('jane'),
      indexedAt: '2026-02-01T00:00:00.000Z'
    }
  }
}

describe('bluesky loader', () => {
  setupEnvironment(getTestEnvironment())

  beforeEach(() => {
    mockRequest()
  })

  afterEach(() => {
    checkAndRemoveRequestMock()
  })

  test('detects own URLs', () => {
    let { bluesky } = loaders
    equal(
      bluesky.isMineUrl(new URL('https://bsky.app/profile/jane.bsky.social')),
      'jane.bsky.social'
    )
    equal(
      bluesky.isMineUrl(new URL('https://bsky.app/profile/jane.com/post/1')),
      false
    )
    equal(bluesky.isMineUrl(new URL('https://example.com/profile/a')), false)
    equal(bluesky.isMineUrl(new URL('https://example.com')), undefined)
    equal(bluesky.isMineUrl(new URL('http://localhost')), false)
  })

  test('detects profiles', async () => {
    let { bluesky } = loaders
    let task = createDownloadTask()
    async function detect(
      url: string,
      html?: string,
      requested = url
    ): Promise<false | DetectedFeed> {
      return bluesky.detectFeed(page(url, html), task, requested)
    }

    deepEqual(await detect('https://bsky.app/profile/did:plc:jane'), {
      title: 'Jane Doe',
      url: 'https://bsky.app/profile/jane.bsky.social'
    })

    expectRequest(`${API}/app.bsky.actor.getProfile?actor=bob.com`).andRespond(
      200,
      JSON.stringify(profile('bob', { displayName: ' ', handle: 'bob.com' })),
      'application/json'
    )
    deepEqual(
      await detect(
        'https://bsky.app/profile/bob.com',
        '<!DOCTYPE html><html></html>'
      ),
      { title: 'bob.com', url: 'https://bsky.app/profile/bob.com' }
    )

    expectRequest(`${API}/app.bsky.actor.getProfile?actor=old.com`).andRespond(
      200,
      JSON.stringify(profile('old', { handle: 'handle.invalid' })),
      'application/json'
    )
    deepEqual(
      await detect(
        'https://bsky.app/',
        PAGE,
        'https://bsky.app/profile/old.com'
      ),
      { title: 'OLD', url: 'https://bsky.app/profile/did:plc:old' }
    )

    expectRequest(
      `${API}/app.bsky.actor.getProfile?actor=unknown.com`
    ).andRespond(400)
    equal(
      await detect(
        'https://bsky.app/profile/unknown.com',
        '<!DOCTYPE html><html></html>'
      ),
      false
    )

    expectRequest(`${API}/app.bsky.actor.getProfile?actor=jane.com`).andRespond(
      200,
      JSON.stringify(profile('jane', { handle: 'jane.com' })),
      'application/json'
    )
    deepEqual(
      await detect(
        'https://example.com/jane',
        '<!DOCTYPE html><html></html>',
        'https://jane.com'
      ),
      { title: 'JANE', url: 'https://bsky.app/profile/jane.com' }
    )

    expectRequest(
      `${API}/app.bsky.actor.getProfile?actor=example.com`
    ).andRespond(400)
    equal(await detect('https://example.com/', '<html></html>'), false)

    await expectNotMine(
      bluesky,
      createTextResponse('<rss></rss>', {
        contentType: 'application/rss+xml',
        url: 'https://jane.com/'
      })
    )
    await expectNotMine(bluesky, page('https://jane.com/?a'))
    await expectNotMine(
      bluesky,
      page('https://bsky.app/profile/jane.com/post/1')
    )
    await expectNotMine(bluesky, page('https://example.com/profile/jane.com'))
  })

  test('finds profile by handle', async () => {
    let { bluesky } = loaders
    let task = createDownloadTask()
    deepEqual(await bluesky.getProfilesByHandle!(task, '@jane'), [])
    deepEqual(await bluesky.getProfilesByHandle!(task, '@jane@example.com'), [])
    deepEqual(await bluesky.getProfilesByHandle!(task, '@Jane.bsky.social'), [
      'https://bsky.app/profile/jane.bsky.social'
    ])
  })

  test('loads feed data', async () => {
    expectRequest(
      `${API}/app.bsky.actor.getProfile?actor=jane.bsky.social`
    ).andRespond(200, JSON.stringify(profile('jane')), 'application/json')
    deepEqual(
      await loaders.bluesky.loadFeedData(
        createDownloadTask(),
        'https://bsky.app/profile/jane.bsky.social'
      ),
      {
        avatar: 'https://cdn.bsky.app/jane.jpg',
        handle: '@jane.bsky.social',
        title: 'JANE',
        url: 'https://bsky.app/profile/jane.bsky.social'
      }
    )
  })

  test('finds profile from post', () => {
    let { bluesky } = loaders
    deepEqual(
      bluesky.getMineLinksFromText(
        page('https://bsky.app/profile/jane.bsky.social/post/1')
      ),
      ['https://bsky.app/profile/jane.bsky.social']
    )
    deepEqual(
      bluesky.getMineLinksFromText(
        page('https://bsky.app/profile/jane.bsky.social')
      ),
      []
    )
    deepEqual(
      bluesky.getWorseLinksFromText!(
        page('https://bsky.app/profile/jane.bsky.social')
      ),
      ['https://bsky.app/profile/did:plc:jane/rss']
    )
    deepEqual(
      bluesky.getWorseLinksFromText!(
        page(
          'https://jane.com/',
          '<link rel="alternate" type="application/rss+xml" href="/rss">'
        )
      ),
      []
    )
    deepEqual(
      bluesky.getSuggestedLinksFromText(
        page('https://bsky.app/profile/jane.bsky.social')
      ),
      []
    )
  })

  test('loads posts', async () => {
    expectRequest(
      `${API}/app.bsky.feed.getAuthorFeed?actor=jane.bsky.social` +
        '&filter=posts_with_replies'
    ).andRespond(
      200,
      JSON.stringify({
        cursor: 'next',
        feed: [
          {
            post: post('1', {
              embed: {
                $type: 'app.bsky.embed.external#view',
                external: {
                  description: 'Description',
                  thumb: 'https://cdn.bsky.app/thumb.jpg',
                  title: 'Link',
                  uri: 'https://example.com/'
                }
              },
              record: {
                createdAt: '2026-01-01T00:00:00.000Z',
                facets: [
                  {
                    features: [
                      {
                        $type: 'app.bsky.richtext.facet#link',
                        uri: 'https://example.com/long'
                      }
                    ],
                    index: { byteEnd: 20, byteStart: 6 }
                  },
                  {
                    features: [
                      {
                        $type: 'app.bsky.richtext.facet#mention',
                        did: 'did:plc:bob'
                      }
                    ],
                    index: { byteEnd: 25, byteStart: 21 }
                  },
                  {
                    features: [
                      { $type: 'app.bsky.richtext.facet#tag', tag: 'a b' }
                    ],
                    index: { byteEnd: 30, byteStart: 26 }
                  },
                  {
                    features: [{ $type: 'blue.poll.facet#unknown' }],
                    index: { byteEnd: 3, byteStart: 0 }
                  }
                ],
                text: '🙂: example.com... @bob #a_b\n\nA & <b>\nNext\n\n\n'
              }
            })
          },
          {
            post: post('2', {
              embed: {
                $type: 'app.bsky.embed.images#view',
                images: [
                  {
                    alt: 'Cat',
                    aspectRatio: { height: 1, width: 2 },
                    fullsize: 'https://cdn.bsky.app/cat.jpg'
                  },
                  { alt: '', fullsize: 'https://cdn.bsky.app/dog.jpg' }
                ]
              },
              labels: [{ val: 'nudity' }]
            })
          },
          {
            post: post('3', {
              embed: {
                $type: 'app.bsky.embed.video#view',
                alt: 'Clip',
                cid: 'clip',
                playlist: 'https://video.bsky.app/playlist.m3u8',
                thumbnail: 'https://video.bsky.app/thumbnail.jpg'
              },
              record: {
                createdAt: '2026-01-01T00:00:00.000Z',
                labels: { values: [{ val: 'graphic-media' }] },
                text: ''
              }
            })
          },
          {
            post: post('gif', {
              author: profile('bob', { did: 'did:web:bob.com' }),
              embed: {
                $type: 'app.bsky.embed.video#view',
                cid: 'gif',
                playlist: 'https://video.bsky.app/gif.m3u8',
                presentation: 'gif'
              },
              uri: 'at://did:web:bob.com/app.bsky.feed.post/gif'
            })
          },
          {
            post: post('4', {
              embed: {
                $type: 'app.bsky.embed.external#view',
                external: {
                  description: 'Alt: Dancing cat',
                  thumb: 'https://cdn.bsky.app/gif.jpg',
                  title: 'Cat GIF',
                  uri: 'https://media.tenor.com/abcAAAAC/cat.gif?hh=10&ww=20'
                }
              },
              labels: [{ val: 'bot' }]
            })
          },
          {
            post: post('original', {
              author: profile('bob', { avatar: undefined }),
              embed: {
                $type: 'app.bsky.embed.recordWithMedia#view',
                media: {
                  $type: 'app.bsky.embed.images#view',
                  images: [{ alt: '', fullsize: 'https://cdn.bsky.app/a.jpg' }]
                },
                record: {
                  record: {
                    $type: 'app.bsky.embed.record#viewRecord',
                    author: profile('jane'),
                    embeds: [
                      {
                        $type: 'app.bsky.embed.record#view',
                        record: {
                          $type: 'app.bsky.embed.record#viewRecord',
                          author: profile('bob', { handle: 'bob.com' }),
                          uri: uri('bob', 'deep'),
                          value: {
                            createdAt: '2026-01-01T00:00:00.000Z',
                            text: 'deep'
                          }
                        }
                      }
                    ],
                    uri: uri('jane', 'quoted'),
                    value: {
                      createdAt: '2026-01-01T00:00:00.000Z',
                      text: 'quoted'
                    }
                  }
                }
              },
              uri: uri('bob', 'original')
            }),
            reason: {
              $type: 'app.bsky.feed.defs#reasonRepost',
              by: profile('jane', { displayName: '' }),
              indexedAt: '2026-01-03T00:00:00.000Z',
              uri: 'at://did:plc:jane/app.bsky.feed.repost/1'
            }
          },
          {
            post: post('5', {
              embed: {
                $type: 'app.bsky.embed.record#view',
                record: {
                  $type: 'app.bsky.embed.record#viewNotFound',
                  uri: uri('bob', 'deleted')
                }
              }
            })
          },
          {
            post: post('6', {
              embed: {
                $type: 'app.bsky.embed.record#view',
                record: {
                  $type: 'app.bsky.feed.defs#generatorView',
                  uri: 'at://did:plc:bob/app.bsky.feed.generator/1'
                }
              }
            })
          }
        ]
      }),
      'application/json'
    )
    expectRequest('https://plc.directory/did:plc:jane').andRespond(
      200,
      JSON.stringify({
        service: [
          { id: '#atproto_labeler', serviceEndpoint: 'https://a.com' },
          { id: '#atproto_pds', serviceEndpoint: 'https://pds.example.com' }
        ]
      }),
      'application/did+ld+json'
    )
    expectRequest('https://bob.com/.well-known/did.json').andRespond(404)
    let posts = loaders.bluesky.getPosts(
      createDownloadTask(),
      'https://bsky.app/profile/jane.bsky.social',
      page('https://bsky.app/profile/jane.bsky.social')
    )
    deepEqual(await loadedPostsValue(posts), {
      error: undefined,
      hasNext: true,
      isLoading: false,
      list: [
        {
          full:
            '<p>🙂: <a href="https://example.com/long">example.com...</a> ' +
            '<a href="https://bsky.app/profile/did:plc:bob">@bob</a> ' +
            '<a href="https://bsky.app/hashtag/a%20b">#a_b</a></p>' +
            '<p>A &amp; &lt;b&gt;<br>Next</p>',
          originId: uri('jane', '1'),
          preview: {
            description: 'Description',
            image: 'https://cdn.bsky.app/thumb.jpg',
            title: 'Link',
            url: 'https://example.com/'
          },
          publishedAt: 1767225600,
          url: 'https://bsky.app/profile/jane.bsky.social/post/1'
        },
        {
          full: '<p>2</p>',
          media: [
            {
              alt: 'Cat',
              sensitive: true,
              type: 'image',
              url: 'https://cdn.bsky.app/cat.jpg'
            },
            {
              sensitive: true,
              type: 'image',
              url: 'https://cdn.bsky.app/dog.jpg'
            }
          ],
          mediaSizes: [{ approximate: true, height: 1, width: 2 }, null],
          originId: uri('jane', '2'),
          publishedAt: 1767225600,
          url: 'https://bsky.app/profile/jane.bsky.social/post/2'
        },
        {
          media: [
            {
              alt: 'Clip',
              poster: 'https://video.bsky.app/thumbnail.jpg',
              sensitive: true,
              sources: [
                {
                  type: 'application/vnd.apple.mpegurl',
                  url: 'https://video.bsky.app/playlist.m3u8'
                }
              ],
              type: 'video',
              url:
                'https://pds.example.com/xrpc/com.atproto.sync.getBlob' +
                '?did=did%3Aplc%3Ajane&cid=clip'
            }
          ],
          originId: uri('jane', '3'),
          publishedAt: 1767225600,
          url: 'https://bsky.app/profile/jane.bsky.social/post/3'
        },
        {
          full: '<p>gif</p>',
          media: [
            {
              type: 'video;mode=gif',
              url: 'https://video.bsky.app/gif.m3u8'
            }
          ],
          originId: 'at://did:web:bob.com/app.bsky.feed.post/gif',
          publishedAt: 1767225600,
          url: 'https://bsky.app/profile/bob.bsky.social/post/gif'
        },
        {
          full: '<p>4</p>',
          media: [
            {
              alt: 'Dancing cat',
              poster: 'https://cdn.bsky.app/gif.jpg',
              type: 'video;mode=gif',
              url: 'https://t.gifs.bsky.app/abcAAAP1/cat.mp4'
            }
          ],
          mediaSizes: [{ height: 10, width: 20 }],
          originId: uri('jane', '4'),
          publishedAt: 1767225600,
          url: 'https://bsky.app/profile/jane.bsky.social/post/4'
        },
        {
          author: {
            title: 'BOB',
            url: 'https://bsky.app/profile/bob.bsky.social'
          },
          full: '<p>original</p>',
          media: [{ type: 'image', url: 'https://cdn.bsky.app/a.jpg' }],
          originId: uri('bob', 'original'),
          publishedAt: 1767225600,
          quoted: {
            author: {
              avatar: 'https://cdn.bsky.app/jane.jpg',
              title: 'JANE',
              url: 'https://bsky.app/profile/jane.bsky.social'
            },
            full: '<p>quoted</p>',
            missing: false,
            publishedAt: 1767225600,
            quotedUrl: 'https://bsky.app/profile/bob.com/post/deep',
            url: 'https://bsky.app/profile/jane.bsky.social/post/quoted'
          },
          repostedBy: {
            avatar: 'https://cdn.bsky.app/jane.jpg',
            title: 'jane.bsky.social',
            url: 'https://bsky.app/profile/jane.bsky.social'
          },
          sortedAt: 1767398400,
          url: 'https://bsky.app/profile/bob.bsky.social/post/original'
        },
        {
          full: '<p>5</p>',
          originId: uri('jane', '5'),
          publishedAt: 1767225600,
          quoted: { missing: true },
          url: 'https://bsky.app/profile/jane.bsky.social/post/5'
        },
        {
          full: '<p>6</p>',
          originId: uri('jane', '6'),
          publishedAt: 1767225600,
          unsupported: true,
          url: 'https://bsky.app/profile/jane.bsky.social/post/6'
        }
      ]
    })

    expectRequest(
      `${API}/app.bsky.feed.getAuthorFeed?actor=jane.bsky.social` +
        '&filter=posts_with_replies&cursor=next'
    ).andRespond(200, '{"feed":[]}', 'application/json')
    let first = posts.get().list
    deepEqual(await posts.next(), [])
    deepEqual(posts.get().list, first)
    equal(posts.get().hasNext, false)
  })

  test('uses DID from loader data', async () => {
    expectRequest(
      `${API}/app.bsky.actor.getProfile?actor=jane.bsky.social`
    ).andRespond(200, JSON.stringify(profile('jane')), 'application/json')
    equal(
      await loaders.bluesky.getLoaderData!(
        createDownloadTask(),
        'https://bsky.app/profile/jane.bsky.social'
      ),
      '{"did":"did:plc:jane"}'
    )

    expectRequest(FEED).andRespond(200, '{"feed":[]}', 'application/json')
    await loaders.bluesky.getPosts(
      createDownloadTask(),
      'https://bsky.app/profile/jane.bsky.social',
      undefined,
      undefined,
      '{"did":"did:plc:jane"}'
    ).loading

    for (let broken of ['{', '{"did":1}']) {
      expectRequest(
        `${API}/app.bsky.feed.getAuthorFeed?actor=jane.bsky.social` +
          '&filter=posts_with_replies'
      ).andRespond(200, '{"feed":[]}', 'application/json')
      await loaders.bluesky.getPosts(
        createDownloadTask(),
        'https://bsky.app/profile/jane.bsky.social',
        undefined,
        undefined,
        broken
      ).loading
    }
  })

  test('validates API answers', async () => {
    expectRequest(FEED).andRespond(200, '{}', 'application/json')
    let posts = loaders.bluesky.getPosts(
      createDownloadTask(),
      'https://bsky.app/profile/did:plc:jane'
    )
    await posts.loading
    equal(posts.get().error instanceof ParseError, true)

    expectRequest(
      `${API}/app.bsky.actor.getProfile?actor=jane.bsky.social`
    ).andRespond(200, '{}', 'application/json')
    let error: unknown
    try {
      await loaders.bluesky.getLoaderData!(
        createDownloadTask(),
        'https://bsky.app/profile/jane.bsky.social'
      )
    } catch (e) {
      error = e
    }
    equal(error instanceof ParseError, true)
  })

  test('links threads and adds replied posts', async () => {
    expectRequest(FEED).andRespond(
      200,
      JSON.stringify({
        feed: [
          {
            post: post('2', {
              record: {
                createdAt: '2026-01-01T00:00:00.000Z',
                reply: {
                  parent: { uri: uri('jane', '1') },
                  root: { uri: uri('jane', '1') }
                },
                text: '2'
              }
            })
          },
          {
            post: post('r', {
              author: profile('bob'),
              record: {
                createdAt: '2026-01-01T00:00:00.000Z',
                reply: {
                  parent: { uri: uri('bob', 'self') },
                  root: { uri: uri('bob', 'self') }
                },
                text: 'r'
              },
              uri: uri('bob', 'r')
            }),
            reason: {
              $type: 'app.bsky.feed.defs#reasonRepost',
              by: profile('jane'),
              indexedAt: '2026-01-01T00:00:00.000Z',
              uri: 'at://did:plc:jane/app.bsky.feed.repost/1'
            },
            reply: {
              parent: {
                $type: 'app.bsky.feed.defs#postView',
                ...post('parent', {
                  author: profile('alice'),
                  uri: uri('alice', 'parent')
                })
              }
            }
          },
          {
            post: post('r2', { author: profile('bob'), uri: uri('bob', 'r2') }),
            reason: {
              $type: 'app.bsky.feed.defs#reasonRepost',
              by: profile('jane'),
              indexedAt: '2026-01-01T00:00:00.000Z'
            },
            reply: {
              parent: {
                $type: 'app.bsky.feed.defs#notFoundPost',
                uri: uri('alice', 'deleted')
              }
            }
          }
        ]
      }),
      'application/json'
    )
    let posts = loaders.bluesky.getPosts(
      createDownloadTask(),
      'https://bsky.app/profile/did:plc:jane'
    )
    await posts.loading
    let list = posts.get().list
    equal(list[0]!.selfReplyTo, uri('jane', '1'))
    equal(list[1]!.selfReplyTo, undefined)
    deepEqual(list[1]!.replied, {
      author: {
        avatar: 'https://cdn.bsky.app/alice.jpg',
        title: 'ALICE',
        url: 'https://bsky.app/profile/alice.bsky.social'
      },
      full: '<p>parent</p>',
      missing: false,
      publishedAt: 1767225600,
      url: 'https://bsky.app/profile/alice.bsky.social/post/parent'
    })
    equal(list[2]!.originId, uri('bob', 'r2'))
    deepEqual(list[2]!.replied, { missing: true })
  })

  test('skips replies to others', async () => {
    let janeReply = (id: string, parent: string, root: string): object =>
      post(id, {
        record: {
          createdAt: '2026-01-01T00:00:00.000Z',
          reply: { parent: { uri: parent }, root: { uri: root } },
          text: id
        }
      })
    let feed = JSON.stringify({
      cursor: 'next',
      feed: [
        repost(bobPost('1', { replyCount: 3 })),
        repost(
          bobPost('2', {
            record: {
              createdAt: '2026-01-01T00:00:00.000Z',
              reply: {
                parent: { uri: uri('bob', '1') },
                root: { uri: uri('bob', '1') }
              },
              text: '2'
            },
            replyCount: 1
          })
        ),
        repost(bobPost('single')),
        { post: janeReply('j2', uri('jane', 'j1'), uri('jane', 'j1')) },
        { post: janeReply('toBob', uri('bob', '1'), uri('bob', '1')) },
        { post: janeReply('inBob', uri('jane', 'toBob'), uri('bob', '1')) },
        { post: post('j1', { replyCount: 1 }) }
      ]
    })
    expectRequest(FEED).andRespond(200, feed, 'application/json')
    let posts = loaders.bluesky.getPosts(
      createDownloadTask(),
      'https://bsky.app/profile/did:plc:jane'
    )
    await posts.loading
    deepEqual(
      posts
        .get()
        .list.map(i => [
          i.originId.split('/').at(-1),
          i.selfReplyTo?.split('/').at(-1),
          i.repostedBy?.title,
          i.hasReplies
        ]),
      [
        ['1', undefined, 'JANE', true],
        ['2', undefined, 'JANE', undefined],
        ['single', undefined, 'JANE', undefined],
        ['j2', 'j1', undefined, undefined],
        ['j1', undefined, undefined, true]
      ]
    )
    equal(posts.get().hasNext, true)

    expectRequest(FEED).andRespond(200, feed, 'application/json')
    let refreshed = loaders.bluesky.getPosts(
      createDownloadTask(),
      'https://bsky.app/profile/did:plc:jane',
      undefined,
      Date.parse('2026-02-02T00:00:00.000Z') / 1000
    )
    await refreshed.loading
    equal(refreshed.get().list.length, 5)
    equal(refreshed.get().hasNext, false)
  })

  test('finds next posts of the thread', async () => {
    let reply = (
      id: string,
      parent: string,
      hour: string,
      fields: object = {}
    ): object =>
      bobPost(id, {
        record: {
          createdAt: `2026-01-01T${hour}:00:00.000Z`,
          reply: {
            parent: { uri: uri('bob', parent) },
            root: { uri: uri('bob', '1') }
          },
          text: id
        },
        ...fields
      })
    expectRequest(threadUrl(uri('bob', '1'), 0, 10)).andRespond(
      200,
      JSON.stringify({
        thread: {
          $type: 'app.bsky.feed.defs#threadViewPost',
          post: bobPost('1'),
          replies: [
            {
              $type: 'app.bsky.feed.defs#threadViewPost',
              post: post('alice', {
                author: profile('alice'),
                uri: uri('alice', 'alice')
              })
            },
            {
              $type: 'app.bsky.feed.defs#threadViewPost',
              post: reply('later', '1', '02')
            },
            {
              $type: 'app.bsky.feed.defs#threadViewPost',
              post: reply('2', '1', '01'),
              replies: [
                {
                  $type: 'app.bsky.feed.defs#threadViewPost',
                  post: reply('3', '2', '03', { replyCount: 1 })
                }
              ]
            },
            { $type: 'app.bsky.feed.defs#blockedPost' }
          ]
        }
      }),
      'application/json'
    )
    expectRequest(threadUrl(uri('bob', '3'), 0, 10)).andRespond(
      200,
      JSON.stringify({
        thread: {
          $type: 'app.bsky.feed.defs#threadViewPost',
          post: reply('3', '2', '03', { replyCount: 1 }),
          replies: [
            {
              $type: 'app.bsky.feed.defs#threadViewPost',
              post: reply('4', '3', '04'),
              replies: []
            }
          ]
        }
      }),
      'application/json'
    )
    deepEqual(
      (
        await loaders.bluesky.getThreadDescendants!(
          createDownloadTask(),
          'https://bsky.app/profile/jane.bsky.social',
          uri('bob', '1')
        )
      ).map(i => [
        i.originId.split('/').at(-1),
        i.selfReplyTo?.split('/').at(-1),
        i.author?.title
      ]),
      [
        ['2', '1', 'BOB'],
        ['3', '2', 'BOB'],
        ['4', '3', 'BOB']
      ]
    )
  })

  test('finds earlier posts of the thread', async () => {
    let { bluesky } = loaders
    let feed = 'https://bsky.app/profile/jane.bsky.social'
    expectRequest(threadUrl(uri('jane', '3'), 1000)).andRespond(
      200,
      JSON.stringify({
        thread: {
          $type: 'app.bsky.feed.defs#threadViewPost',
          parent: {
            $type: 'app.bsky.feed.defs#threadViewPost',
            parent: {
              $type: 'app.bsky.feed.defs#threadViewPost',
              post: post('1')
            },
            post: post('2', {
              record: {
                createdAt: '2026-01-01T00:00:00.000Z',
                reply: {
                  parent: { uri: uri('jane', '1') },
                  root: { uri: uri('jane', '1') }
                },
                text: '2'
              }
            })
          },
          post: post('3')
        }
      }),
      'application/json'
    )
    deepEqual(
      (
        await bluesky.getThreadAncestors!(
          createDownloadTask(),
          feed,
          uri('jane', '3')
        )
      ).map(i => [i.originId, i.selfReplyTo]),
      [
        [uri('jane', '1'), undefined],
        [uri('jane', '2'), uri('jane', '1')]
      ]
    )

    expectRequest(threadUrl(uri('jane', '5'), 1000)).andRespond(
      200,
      JSON.stringify({
        thread: {
          $type: 'app.bsky.feed.defs#threadViewPost',
          parent: {
            $type: 'app.bsky.feed.defs#threadViewPost',
            parent: {
              $type: 'app.bsky.feed.defs#threadViewPost',
              post: post('3', { author: profile('bob'), uri: uri('bob', '3') })
            },
            post: post('4')
          },
          post: post('5')
        }
      }),
      'application/json'
    )
    deepEqual(
      await bluesky.getThreadAncestors!(
        createDownloadTask(),
        feed,
        uri('jane', '5')
      ),
      []
    )

    expectRequest(threadUrl(uri('jane', '7'), 1000)).andRespond(
      200,
      JSON.stringify({
        thread: {
          $type: 'app.bsky.feed.defs#threadViewPost',
          parent: {
            $type: 'app.bsky.feed.defs#notFoundPost',
            uri: uri('jane', '6')
          },
          post: post('7')
        }
      }),
      'application/json'
    )
    deepEqual(
      await bluesky.getThreadAncestors!(
        createDownloadTask(),
        feed,
        uri('jane', '7')
      ),
      []
    )

    expectRequest(threadUrl(uri('jane', '8'), 1000)).andRespond(
      200,
      '{}',
      'application/json'
    )
    let error: unknown
    try {
      await bluesky.getThreadAncestors!(
        createDownloadTask(),
        feed,
        uri('jane', '8')
      )
    } catch (e) {
      error = e
    }
    equal(error instanceof ParseError, true)
  })

  test('loads post by URL', async () => {
    let { bluesky } = loaders
    equal(
      bluesky.isPostUrl!(new URL('https://bsky.app/profile/jane.com/post/1')),
      true
    )
    equal(
      bluesky.isPostUrl!(new URL('https://bsky.app/profile/jane.com')),
      false
    )
    equal(
      bluesky.isPostUrl!(
        new URL('https://example.com/profile/jane.com/post/1')
      ),
      false
    )
    equal(
      bluesky.isProfileUrl!(new URL('https://bsky.app/profile/jane.com')),
      true
    )
    equal(
      bluesky.isProfileUrl!(
        new URL('https://bsky.app/profile/jane.com/post/1')
      ),
      false
    )
    equal(
      bluesky.isProfileUrl!(new URL('https://example.com/profile/jane.com')),
      false
    )

    expectRequest(
      threadUrl('at://jane.bsky.social/app.bsky.feed.post/1', 0)
    ).andRespond(
      200,
      JSON.stringify({
        thread: { $type: 'app.bsky.feed.defs#threadViewPost', post: post('1') }
      }),
      'application/json'
    )
    deepEqual(
      await bluesky.getPostByUrl!(
        createDownloadTask(),
        'https://bsky.app/profile/jane.bsky.social/post/1'
      ),
      {
        author: {
          avatar: 'https://cdn.bsky.app/jane.jpg',
          title: 'JANE',
          url: 'https://bsky.app/profile/jane.bsky.social'
        },
        full: '<p>1</p>',
        id: 'https://bsky.app/profile/jane.bsky.social/post/1',
        originId: uri('jane', '1'),
        publishedAt: 1767225600,
        url: 'https://bsky.app/profile/jane.bsky.social/post/1'
      }
    )

    expectRequest(
      threadUrl('at://jane.bsky.social/app.bsky.feed.post/2', 0)
    ).andRespond(
      200,
      JSON.stringify({
        thread: {
          $type: 'app.bsky.feed.defs#notFoundPost',
          uri: uri('jane', '2')
        }
      }),
      'application/json'
    )
    let error: unknown
    try {
      await bluesky.getPostByUrl!(
        createDownloadTask(),
        'https://bsky.app/profile/jane.bsky.social/post/2'
      )
    } catch (e) {
      error = e
    }
    equal(error instanceof ParseError, true)
  })

  test('returns post source', async () => {
    expectRequest(threadUrl(uri('jane', '1'), 0)).andRespond(
      200,
      JSON.stringify({
        thread: { $type: 'app.bsky.feed.defs#threadViewPost', post: post('1') }
      }),
      'application/json'
    )
    deepEqual(
      await loaders.bluesky.getPostSource(
        testFeed({ url: 'https://bsky.app/profile/jane.bsky.social' }),
        uri('jane', '1')
      ),
      post('1')
    )
  })
})

let pair = await crypto.subtle.generateKey(
  { name: 'ECDSA', namedCurve: 'P-256' },
  true,
  ['sign', 'verify']
)
let jwk = await crypto.subtle.exportKey('jwk', pair.privateKey)
let dpopKey = { crv: jwk.crv!, d: jwk.d!, kty: jwk.kty!, x: jwk.x!, y: jwk.y! }

const TOKEN = 'https://auth.example.com/oauth/token'

describe('bluesky account', () => {
  setupEnvironment(getTestEnvironment())

  beforeEach(() => {
    mockRequest()
  })

  afterEach(() => {
    checkAndRemoveRequestMock()
  })

  let signedIn = loaders.bluesky.account!

  let servers = 0

  /**
   * PDS nonce is cached by origin, so every test has own server
   */
  function createAuth(
    credentials: Partial<AccountCredentials> = {},
    reload?: AccountCredentials
  ): { auth: AccountAuth; saved: AccountCredentials[] } {
    servers += 1
    let saved: AccountCredentials[] = []
    let auth: AccountAuth = {
      account: testAccount({
        credentials: {
          accessToken: 'access',
          clientId: 'client',
          clientSecret: null,
          dpopKey,
          expiresAt: Math.round(Date.now() / 1000) + 3600,
          refreshToken: 'refresh',
          tokenUrl: TOKEN,
          ...credentials
        },
        server: `https://pds${servers}.example.com`,
        service: 'bluesky',
        url: 'https://bsky.app/profile/did:plc:me'
      }),
      reload: () => Promise.resolve(reload),
      save(value: AccountCredentials) {
        saved.push(value)
        return Promise.resolve()
      }
    }
    return { auth, saved }
  }

  function xrpc(auth: AccountAuth, path: string): string {
    return `${auth.account.server}/xrpc/${path}`
  }

  function respond(
    url: string,
    body: unknown,
    status = 200,
    headers: Record<string, string> = {}
  ): ReturnType<typeof expectRequest> {
    let request = expectRequest(url)
    request.andRespond(
      status,
      JSON.stringify(body),
      'application/json',
      headers
    )
    return request
  }

  function decode(part: string): Record<string, unknown> {
    let json = atob(part.replaceAll('-', '+').replaceAll('_', '/'))
    return JSON.parse(json) as Record<string, unknown>
  }

  function getProof(
    request: ReturnType<typeof expectRequest>
  ): Record<string, unknown> {
    let headers = new Headers(request.sent().headers)
    return {
      authorization: headers.get('Authorization'),
      ...decode(headers.get('DPoP')!.split('.')[1]!)
    }
  }

  function timeline(auth: AccountAuth, cursor?: string): string {
    return xrpc(
      auth,
      'app.bsky.feed.getTimeline?limit=50' + (cursor ? `&cursor=${cursor}` : '')
    )
  }

  function bobProfile(auth: AccountAuth): string {
    return xrpc(
      auth,
      `app.bsky.actor.getProfile?actor=${encodeURIComponent('bob.bsky.social')}`
    )
  }

  test('loads home timeline', async () => {
    let { auth } = createAuth()
    let first = respond(timeline(auth), {
      cursor: 'c1',
      feed: [
        { post: bobPost('1') },
        {
          post: bobPost('2', {
            record: {
              createdAt: '2026-01-01T00:00:00.000Z',
              reply: {
                parent: { uri: uri('alice', 'a') },
                root: { uri: uri('alice', 'a') }
              },
              text: '2'
            }
          })
        },
        repost(bobPost('3'))
      ]
    })
    let posts = signedIn.getTimeline(createDownloadTask(), auth, 0)
    await posts.loading
    let proof = getProof(first)
    equal(proof.authorization, 'DPoP access')
    equal(proof.htm, 'GET')
    equal(proof.htu, xrpc(auth, 'app.bsky.feed.getTimeline'))
    equal(proof.ath, await sha256('access'))
    deepEqual(
      posts
        .get()
        .list.map(item => [
          item.originId,
          item.author?.title,
          item.repostedBy?.title,
          item.sortedAt
        ]),
      [
        [uri('bob', '1'), 'BOB', undefined, undefined],
        [uri('bob', '3'), 'BOB', 'JANE', 1769904000]
      ]
    )
    equal(posts.get().hasNext, true)

    respond(timeline(auth, 'c1'), { feed: [] })
    await posts.next()
    equal(posts.get().hasNext, false)
  })

  test('stops timeline on the previous refresh', async () => {
    let { auth } = createAuth()
    respond(timeline(auth), { cursor: 'c1', feed: [{ post: bobPost('1') }] })
    let posts = signedIn.getTimeline(
      createDownloadTask(),
      auth,
      Math.round(Date.now() / 1000)
    )
    await posts.loading
    equal(posts.get().hasNext, false)
  })

  test('repeats request with nonce', async () => {
    let { auth } = createAuth()
    respond(bobProfile(auth), { error: 'use_dpop_nonce' }, 401, {
      'DPoP-Nonce': 'n1'
    })
    let second = respond(bobProfile(auth), profile('bob'), 200, {
      'DPoP-Nonce': 'n2'
    })
    let url = 'https://bsky.app/profile/bob.bsky.social'
    let task = createDownloadTask()
    equal(await signedIn.isFollowing(task, auth, url), false)
    equal(getProof(second).nonce, 'n1')

    let third = respond(
      bobProfile(auth),
      profile('bob', { viewer: { following: 'at://follow' } })
    )
    equal(await signedIn.isFollowing(task, auth, url), true)
    equal(getProof(third).nonce, 'n2')

    respond(bobProfile(auth), {}, 401, {
      'DPoP-Nonce': 'n3',
      'WWW-Authenticate': 'DPoP error="use_dpop_nonce"'
    })
    let fourth = respond(bobProfile(auth), profile('bob'))
    await signedIn.isFollowing(task, auth, url)
    equal(getProof(fourth).nonce, 'n3')
  })

  test('refreshes expired token', async () => {
    let { auth, saved } = createAuth({ expiresAt: 1 })
    let refresh = respond(TOKEN, {
      access_token: 'access2',
      expires_in: 60,
      refresh_token: 'refresh2'
    })
    let request = respond(timeline(auth), { feed: [] })
    let posts = signedIn.getTimeline(createDownloadTask(), auth)
    await posts.loading
    let body = refresh.sent().body as URLSearchParams
    equal(body.get('grant_type'), 'refresh_token')
    equal(body.get('refresh_token'), 'refresh')
    equal(body.get('client_id'), 'client')
    equal(getProof(request).authorization, 'DPoP access2')
    equal(saved.length, 1)
    equal(saved[0]!.accessToken, 'access2')
    equal(saved[0]!.refreshToken, 'refresh2')
    equal(saved[0]!.dpopKey, dpopKey)
    equal(auth.account.credentials.accessToken, 'access2')
  })

  test('refreshes token on wrong token error', async () => {
    let { auth } = createAuth()
    respond(timeline(auth), { error: 'invalid_token' }, 401)
    respond(TOKEN, { access_token: 'access2', refresh_token: 'refresh2' })
    let retry = respond(timeline(auth), { feed: [] })
    let posts = signedIn.getTimeline(createDownloadTask(), auth)
    await posts.loading
    equal(posts.get().error, undefined)
    equal(getProof(retry).authorization, 'DPoP access2')
    equal(auth.account.credentials.expiresAt, undefined)
  })

  test('takes token from another device', async () => {
    let { auth, saved } = createAuth(
      { expiresAt: 1 },
      {
        accessToken: 'other',
        clientId: 'client',
        dpopKey,
        refreshToken: 'other-refresh',
        tokenUrl: TOKEN
      }
    )
    respond(TOKEN, { error: 'invalid_grant' }, 400)
    let request = respond(timeline(auth), { feed: [] })
    let posts = signedIn.getTimeline(createDownloadTask(), auth)
    await posts.loading
    equal(getProof(request).authorization, 'DPoP other')
    equal(saved.length, 0)
  })

  test('asks to sign in again', async () => {
    let { auth } = createAuth({ expiresAt: 1 })
    respond(TOKEN, { error: 'invalid_grant' }, 400)
    let posts = signedIn.getTimeline(createDownloadTask(), auth)
    await posts.loading
    equal(posts.get().error?.message, accountsMessages.get().signInAgain)
  })

  test('throws other errors', async () => {
    let { auth } = createAuth()
    respond(timeline(auth), {}, 500)
    let posts = signedIn.getTimeline(createDownloadTask({ tries: 1 }), auth)
    await posts.loading
    equal(HTTPStatusError.is(posts.get().error, [500]), true)

    respond(timeline(auth), {}, 400)
    posts = signedIn.getTimeline(createDownloadTask({ tries: 1 }), auth)
    await posts.loading
    equal(HTTPStatusError.is(posts.get().error, [400]), true)

    respond(timeline(auth), {}, 401)
    respond(TOKEN, {}, 500)
    let error = await throws(async () => {
      posts = signedIn.getTimeline(createDownloadTask({ tries: 1 }), auth)
      await posts.loading
      let failed = posts.get().error
      if (failed) throw failed
    })
    equal(HTTPStatusError.is(error, [500]), true)
  })

  test('follows and unfollows authors', async () => {
    let { auth } = createAuth()
    let task = createDownloadTask()
    let url = 'https://bsky.app/profile/bob.bsky.social'

    respond(bobProfile(auth), profile('bob'))
    let create = respond(xrpc(auth, 'com.atproto.repo.createRecord'), {})
    await signedIn.follow(task, auth, url)
    equal(getProof(create).htm, 'POST')
    let created = JSON.parse(create.sent().body as string) as {
      record: Record<string, unknown>
    }
    equal(created.record.createdAt?.constructor, String)
    deepEqual(
      { ...created, record: { ...created.record, createdAt: 0 } },
      {
        collection: 'app.bsky.graph.follow',
        record: {
          $type: 'app.bsky.graph.follow',
          createdAt: 0,
          subject: 'did:plc:bob'
        },
        repo: 'did:plc:me'
      }
    )
    equal(
      new Headers(create.sent().headers).get('Content-Type'),
      'application/json'
    )

    let following = 'at://did:plc:me/app.bsky.graph.follow/rkey1'
    respond(bobProfile(auth), profile('bob', { viewer: { following } }))
    await signedIn.follow(task, auth, url)

    respond(bobProfile(auth), profile('bob', { viewer: { following } }))
    let remove = respond(xrpc(auth, 'com.atproto.repo.deleteRecord'), {})
    await signedIn.unfollow(task, auth, url)
    deepEqual(JSON.parse(remove.sent().body as string), {
      collection: 'app.bsky.graph.follow',
      repo: 'did:plc:me',
      rkey: 'rkey1'
    })

    respond(bobProfile(auth), profile('bob'))
    await signedIn.unfollow(task, auth, url)
  })
})
