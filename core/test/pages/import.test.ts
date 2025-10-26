import '../dom-parser.ts'

import { loadValue } from '@logux/client'
import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addCategory,
  addFeed,
  addFilter,
  addPost,
  type CategoryValue,
  checkAndRemoveRequestMock,
  deleteCategory,
  deleteFeed,
  deleteFilter,
  deletePost,
  expectRequest,
  type FeedValue,
  type FilterValue,
  getCategories,
  getFeeds,
  getFilters,
  getPosts,
  mockRequest,
  type PostValue,
  preloadImages,
  testFeed,
  theme,
  waitLoading
} from '../../index.ts'
import { cleanClientTest, enableClientTest, openPage } from '../utils.ts'

const MIME_TYPES = {
  json: 'application/json',
  opml: 'application/xml',
  txt: 'text/plain'
}

let CATEGORY = { id: 'c1', title: 'A' } satisfies CategoryValue
let FEED = {
  categoryId: CATEGORY.id,
  id: 'f1',
  loader: 'atom',
  reading: 'slow',
  title: 'F1',
  url: 'https://example.com/feed'
} satisfies FeedValue
let FILTER = {
  action: 'fast',
  feedId: FEED.id,
  id: 'filter1',
  priority: 1,
  query: 'include(text)'
} satisfies FilterValue
let POST = {
  feedId: FEED.id,
  id: 'p1',
  media: [],
  originId: 'test-1',
  publishedAt: 1000,
  reading: 'fast',
  title: 'Post 1'
} satisfies PostValue

function file(format: keyof typeof MIME_TYPES, content: string): File {
  return new File([content], `feeds.${format}`, {
    type: MIME_TYPES[format]
  })
}

beforeEach(() => {
  enableClientTest()
  mockRequest()
})

afterEach(async () => {
  await cleanClientTest()
  checkAndRemoveRequestMock()
})

test('imports state JSON', async () => {
  await addCategory(CATEGORY)
  await addFeed(FEED)
  await addFilter(FILTER)
  await addPost(POST)
  theme.set('light')
  preloadImages.set('never')

  let exportPage = openPage({
    params: {},
    route: 'export'
  })
  let exportBlob = await exportPage.exportState()
  if (exportBlob === false) {
    throw new Error('Failed to export state')
  }
  await deletePost(POST.id)
  await deleteFilter(FILTER.id)
  await deleteFeed(FEED.id)
  await deleteCategory(CATEGORY.id)
  theme.set('system')
  preloadImages.set('always')

  let page = openPage({
    params: {},
    route: 'import'
  })
  equal(page.importing.get(), false)
  equal(page.fileError.get(), false)
  deepEqual(page.feedErrors.get(), {})

  page.importFile(file('json', await exportBlob.text()))
  await waitLoading(page.importing)
  await setTimeout(100)
  equal(page.fileError.get(), false)
  deepEqual(page.feedErrors.get(), {})
  equal(theme.get(), 'light')
  equal(preloadImages.get(), 'never')
  deepEqual((await loadValue(getCategories())).list, [
    { ...CATEGORY, isLoading: false }
  ])
  deepEqual((await loadValue(getFeeds())).list, [{ ...FEED, isLoading: false }])
  deepEqual((await loadValue(getFilters())).list, [
    { ...FILTER, isLoading: false }
  ])
  deepEqual((await loadValue(getPosts())).list, [{ ...POST, isLoading: false }])
})

test('imports OPML from the app', async () => {
  let FEED2 = testFeed({ url: 'https://a.com/atom' })
  await addCategory(CATEGORY)
  await addFeed(FEED)
  await addFeed(FEED2)
  let feed3 = await addFeed(testFeed({ url: 'https://broken.com/' }))
  let feed4 = await addFeed(testFeed({ url: 'https://unknown.com/' }))

  let exportPage = openPage({
    params: {},
    route: 'export'
  })
  let exportBlob = await exportPage.exportOpml()
  if (exportBlob === false) {
    throw new Error('Failed to export OPML')
  }
  await deleteFeed(FEED.id)
  await deleteFeed(FEED2.id)
  await deleteFeed(feed3)
  await deleteFeed(feed4)
  await deleteCategory(CATEGORY.id)

  let page = openPage({
    params: {},
    route: 'import'
  })
  expectRequest(FEED2.url).andRespond(200, '<feed></feed>')
  expectRequest('https://broken.com/').andRespond(404)
  expectRequest('https://unknown.com/').andRespond(200, '<html></html>')
  expectRequest(FEED.url).andRespond(200, '<rss></rss>')
  page.importFile(file('opml', await exportBlob.text()))
  await waitLoading(page.importing)
  equal(page.fileError.get(), false)
  deepEqual(page.feedErrors.get(), {
    'https://broken.com/': 'unloadable',
    'https://unknown.com/': 'unknown'
  })

  let categories = await loadValue(getCategories())
  deepEqual(
    categories.list.map(i => i.title),
    ['A']
  )
  deepEqual(
    (await loadValue(getFeeds())).list.map(i => ({
      categoryId: i.categoryId,
      loader: i.loader,
      title: i.title
    })),
    [
      { categoryId: 'general', loader: 'atom', title: FEED2.title },
      { categoryId: categories.list[0]?.id, loader: 'rss', title: FEED.title }
    ]
  )
})

test('is ready for unknown files', async () => {
  let page = openPage({
    params: {},
    route: 'import'
  })
  page.importFile(file('txt', ''))
  await waitLoading(page.importing)
  equal(page.fileError.get(), 'unknownFormat')
  deepEqual(page.feedErrors.get(), {})
})

test('is ready for broken JSON', async () => {
  let page = openPage({
    params: {},
    route: 'import'
  })
  page.importFile(file('json', '{'))
  await waitLoading(page.importing)
  equal(page.fileError.get(), 'brokenFile')
  deepEqual(page.feedErrors.get(), {})
})

test('is ready for broken XML', async () => {
  let page = openPage({
    params: {},
    route: 'import'
  })
  page.importFile(file('opml', '<'))
  await waitLoading(page.importing)
  equal(page.fileError.get(), 'brokenFile')
  deepEqual(page.feedErrors.get(), {})
})

test('is ready for unknown XML', async () => {
  let page = openPage({
    params: {},
    route: 'import'
  })
  page.importFile(file('opml', '<html></html>'))
  await waitLoading(page.importing)
  equal(page.fileError.get(), 'brokenFile')
  deepEqual(page.feedErrors.get(), {})
})
