import { restoreAll, spyOn } from 'nanospy'
import { deepEqual, equal, ok } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addAccount,
  addFeed,
  addLaterPost,
  addPost,
  canReturnFromLater,
  changeFeed,
  changePost,
  createDownloadTask,
  deleteFeed,
  deleteFromLater,
  getTables,
  laterMessages,
  type Loader,
  loaders,
  loadPost,
  loadPosts,
  moveToLater,
  onPostsMoved,
  type PostValue,
  returnFromLater,
  saveOriginForLater,
  testAccount,
  testFeed,
  testPost
} from '../index.ts'
import {
  checkAndRemoveRequestMock,
  cleanClient,
  expectRequest,
  mockRequest,
  setupNodeDom,
  startClient,
  throws
} from './utils.ts'

setupNodeDom()

const TEXT =
  'Long paragraph of the article, which is long enough to look like ' +
  'a real text for Mozilla’s Readability, which skips short paragraphs. '

function page(head: string, body: string): string {
  return (
    `<!DOCTYPE html><html><head>${head}</head><body><article>` +
    `<p>${TEXT.repeat(4)}</p><p>${TEXT.repeat(4)}</p>${body}` +
    `<p>${TEXT.repeat(4)}</p></article></body></html>`
  )
}

async function load(id: string): Promise<PostValue> {
  let post = await loadPost(id)
  if (!post) throw new Error(`No post ${id}`)
  return post
}

async function laterPosts(): Promise<PostValue[]> {
  return (await loadPosts()).filter(post => post.later)
}

describe('read later', () => {
  beforeEach(() => {
    startClient()
    mockRequest()
  })

  afterEach(async () => {
    await cleanClient()
    restoreAll()
    checkAndRemoveRequestMock()
  })

  test('moves feed’s thread to Read later and back', async () => {
    let feedId = await addFeed(
      testFeed({
        avatar: 'https://a.com/icon.png',
        reading: 'slow',
        title: 'Blog',
        url: 'https://a.com/feed'
      })
    )
    await addPost([
      testPost({
        feedId,
        id: 'start',
        originId: 'start',
        read: 1,
        reading: 'slow',
        threadId: 'start'
      }),
      testPost({
        author: { title: 'Other', url: 'https://b.com/' },
        feedId,
        id: 'part',
        merged: true,
        originId: 'part',
        reading: 'slow',
        threadId: 'start'
      })
    ])
    let moved: string[] = []
    let unbind = onPostsMoved(ids => {
      moved.push(...ids)
    })

    await moveToLater(await load('start'))
    await setTimeout(10)
    deepEqual(moved.toSorted(), ['part', 'start'])
    let start = await load('start')
    equal(start.feedId, null)
    equal(start.read, 0)
    equal(start.reading, 'slow')
    ok(start.later)
    deepEqual(start.author, {
      avatar: 'https://a.com/icon.png',
      feedId,
      loader: 'rss',
      title: 'Blog',
      url: 'https://a.com/feed'
    })
    deepEqual((await load('part')).author, {
      feedId,
      title: 'Other',
      url: 'https://b.com/'
    })
    equal((await getTables().reactions.get('start'))?.type, 'open')
    equal(canReturnFromLater(start), true)

    await changeFeed(feedId, { reading: 'fast' })
    await changePost(['start', 'part'], { read: 1 })
    moved = []
    await returnFromLater(start)
    unbind()
    deepEqual(moved.toSorted(), ['part', 'start'])
    start = await load('start')
    equal(start.feedId, feedId)
    equal(start.later, null)
    equal(start.author, null)
    equal(start.reading, 'fast')
    equal(start.read, 0)
    equal((await load('part')).read, 0)
    deepEqual((await load('part')).author, {
      title: 'Other',
      url: 'https://b.com/'
    })
  })

  test('keeps saved threads with the same ID apart', async () => {
    let first = await addFeed(testFeed({ reading: 'slow' }))
    let second = await addFeed(testFeed({ reading: 'slow' }))
    await addPost(
      [first, second].flatMap(feedId => [
        testPost({ feedId, id: `${feedId}-1`, originId: '1', threadId: '1' }),
        testPost({
          feedId,
          id: `${feedId}-2`,
          merged: true,
          originId: '2',
          threadId: '1'
        })
      ])
    )
    await moveToLater(await load(`${first}-1`))
    await moveToLater(await load(`${second}-1`))

    await returnFromLater(await load(`${first}-1`))
    equal((await load(`${first}-2`)).feedId, first)
    equal((await load(`${second}-2`)).feedId, null)

    await moveToLater(await load(`${first}-1`))
    await deleteFromLater(await load(`${first}-1`))
    deepEqual((await laterPosts()).map(post => post.id).toSorted(), [
      `${second}-1`,
      `${second}-2`
    ])
  })

  test('moves account’s post back to the account', async () => {
    let accountId = await addAccount(testAccount())
    await addPost(
      testPost({
        accountId,
        author: { title: 'Alice', url: 'https://mastodon.social/@alice' },
        feedId: null,
        id: 'own',
        reading: 'fast'
      })
    )
    await moveToLater(await load('own'))
    let own = await load('own')
    equal(own.accountId, null)
    deepEqual(own.author, {
      accountId,
      title: 'Alice',
      url: 'https://mastodon.social/@alice'
    })

    await addPost(
      testPost({ accountId, feedId: null, id: 'authorless', reading: 'fast' })
    )
    await moveToLater(await load('authorless'))
    equal((await load('authorless')).author, null)

    await returnFromLater(own)
    own = await load('own')
    equal(own.accountId, accountId)
    equal(own.reading, 'fast')
    deepEqual(own.author, {
      title: 'Alice',
      url: 'https://mastodon.social/@alice'
    })
  })

  test('keeps posts without a source in Read later', async () => {
    let feedId = await addFeed(testFeed())
    await addPost([
      testPost({ feedId: null, id: 'link', later: 1 }),
      testPost({ feedId, id: 'saved' })
    ])
    let link = await load('link')
    equal(canReturnFromLater(link), false)
    await moveToLater(link)
    await returnFromLater(link)
    equal((await load('link')).later, 1)

    await moveToLater(await load('saved'))
    await deleteFeed(feedId)
    await returnFromLater(await load('saved'))
    equal((await load('saved')).feedId, null)
    ok((await load('saved')).later)

    await deleteFromLater(link)
    deepEqual(
      (await laterPosts()).map(post => post.id),
      ['saved']
    )
  })

  test('saves post, which is not in the database', async () => {
    let feedId = await addFeed(testFeed())
    await addPost(
      testPost({ feedId, id: 'stored', url: 'https://a.com/stored' })
    )
    await saveOriginForLater({
      full: 'Stored',
      id: '1',
      originId: '1',
      url: 'https://a.com/stored'
    })
    deepEqual(
      (await laterPosts()).map(i => i.id),
      ['stored']
    )
    await saveOriginForLater({
      full: 'Stored',
      id: '1',
      originId: '1',
      url: 'https://a.com/stored'
    })
    equal((await laterPosts()).length, 1)

    await saveOriginForLater({
      author: { loaderData: 'data', title: 'Alice' },
      full: 'New',
      id: '2',
      originId: '2',
      publishedAt: 10
    })
    let created = (await laterPosts()).find(i => i.id !== 'stored')
    equal(created?.full, 'New')
    equal(created?.publishedAt, 10)
    deepEqual(created?.author, { title: 'Alice' })
    ok(created)
    equal(canReturnFromLater(created), false)
  })

  test('adds web page by a link', async () => {
    let task = createDownloadTask()
    expectRequest('https://a.com/post').andRespond(
      200,
      page(
        '<title>Page title</title>' +
          '<meta property="og:site_name" content="Site">',
        '<p><img src="/image.png"></p>'
      )
    )
    expectRequest('https://a.com/').andRespond(
      200,
      '<html><head><link rel="icon" href="/icon.svg"></head></html>'
    )
    expectRequest('https://a.com/icon.svg').andRespond(
      200,
      '<svg></svg>',
      'image/svg+xml'
    )
    equal(await addLaterPost(task, ' a.com/post '), 'added')
    let [post] = await laterPosts()
    ok(post)
    ok(post.full?.includes(TEXT))
    equal(post.title, 'Page title')
    equal(post.url, 'https://a.com/post')
    equal(post.feedId, null)
    equal(post.reading, 'slow')
    ok(post.publishedAt > 1000)
    deepEqual(post.author, {
      avatar: 'https://a.com/icon.svg',
      loader: 'page',
      title: 'Site',
      url: 'https://a.com/'
    })
    deepEqual(post.media, [
      { fromText: true, type: 'image', url: 'https://a.com/image.png' }
    ])
    equal(canReturnFromLater(post), false)

    equal(await addLaterPost(task, 'https://a.com/post'), 'already')
  })

  test('adds link without an article', async () => {
    let task = createDownloadTask()
    expectRequest('https://a.com/short').andRespond(
      200,
      '<html><head><title>Short</title></head><body>Hi</body></html>'
    )
    expectRequest('https://a.com/').andRespond(404)
    expectRequest('https://a.com/favicon.ico').andRespond(404)
    expectRequest('https://a.com/file.pdf').andRespond(
      200,
      'PDF',
      'application/pdf'
    )
    expectRequest('https://a.com/').andRespond(404)
    expectRequest('https://a.com/favicon.ico').andRespond(404)
    await addLaterPost(task, 'https://a.com/short')
    await addLaterPost(task, 'https://a.com/file.pdf')
    deepEqual(
      (await laterPosts())
        .toSorted((a, b) => String(a.title).localeCompare(String(b.title)))
        .map(i => [i.title, i.full, i.author]),
      [
        [
          'https://a.com/file.pdf',
          null,
          { loader: 'page', title: 'a.com', url: 'https://a.com/' }
        ],
        [
          'Short',
          null,
          { loader: 'page', title: 'a.com', url: 'https://a.com/' }
        ]
      ]
    )
  })

  test('adds post of social network by its loader', async () => {
    let mastodon = loaders.mastodon as Required<Loader>
    spyOn(mastodon, 'isPostUrl', () => true)
    spyOn(mastodon, 'getPostByUrl', () =>
      Promise.resolve({
        author: {
          loaderData: 'data',
          title: 'Alice',
          url: 'https://mastodon.social/@alice'
        },
        full: '<p>Toot</p>',
        id: '1',
        originId: '1',
        publishedAt: 10
      })
    )
    await addLaterPost(createDownloadTask(), 'https://mastodon.social/@a/1')
    let [post] = await laterPosts()
    equal(post?.full, '<p>Toot</p>')
    equal(post?.url, 'https://mastodon.social/@a/1')
    ok(post && post.publishedAt > 10)
    deepEqual(post?.author, {
      title: 'Alice',
      url: 'https://mastodon.social/@alice'
    })
  })

  test('rejects wrong links', async () => {
    let error = await throws(() => {
      return addLaterPost(createDownloadTask(), 'ftp://a.com/file')
    })
    equal(error.message, laterMessages.get().notUrl)
  })
})
