import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  createDownloadTask,
  createTextResponse,
  type DetectedFeed,
  loaders,
  ParseError,
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
  `${encodeURIComponent('did:plc:jane')}&filter=posts_and_author_threads`

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
      createdAt: '2026-01-01T00:00:00.000Z',
      text: id
    },
    uri: uri('jane', id),
    ...fields
  }
}

function threadUrl(at: string, parentHeight: number): string {
  return (
    `${API}/app.bsky.feed.getPostThread?uri=${encodeURIComponent(at)}` +
    `&depth=0&parentHeight=${parentHeight}`
  )
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

  test('finds avatar', async () => {
    expectRequest(
      `${API}/app.bsky.actor.getProfile?actor=jane.bsky.social`
    ).andRespond(200, JSON.stringify(profile('jane')), 'application/json')
    equal(
      await loaders.bluesky.getAvatar(
        page('https://bsky.app/profile/jane.bsky.social'),
        createDownloadTask(),
        'https://bsky.app/profile/jane.bsky.social'
      ),
      'https://cdn.bsky.app/jane.jpg'
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
      bluesky.getSupersededLinksFromText!(
        page('https://bsky.app/profile/jane.bsky.social')
      ),
      ['https://bsky.app/profile/did:plc:jane/rss']
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
        '&filter=posts_and_author_threads'
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
          publishedAt: 1767398400,
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
        '&filter=posts_and_author_threads&cursor=next'
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
          '&filter=posts_and_author_threads'
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
                reply: { parent: { uri: uri('jane', '1') } },
                text: '2'
              }
            })
          },
          {
            post: post('r', {
              author: profile('bob'),
              record: {
                createdAt: '2026-01-01T00:00:00.000Z',
                reply: { parent: { uri: uri('bob', 'self') } },
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
                reply: { parent: { uri: uri('jane', '1') } },
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
