import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addCategory,
  addFeed,
  addFilter,
  addPost,
  testFeed,
  testPost,
  waitLoading
} from '../../index.ts'
import { cleanClientTest, enableClientTest, openPage } from '../utils.ts'

let saved: { content: Blob; filename: string } | undefined

beforeEach(() => {
  saved = undefined
  enableClientTest({
    saveFile(filename, content) {
      saved = { content, filename }
    }
  })
})

afterEach(async () => {
  await cleanClientTest()
})

test('export OPML', async () => {
  let idA = await addCategory({ title: 'A' })
  let idB = await addCategory({ title: 'B' })
  await addFeed(testFeed({ categoryId: idA, title: '1' }))
  await addFeed(testFeed({ categoryId: idA, title: '2' }))
  await addFeed(testFeed({ categoryId: idB, title: '3' }))
  await addFeed(testFeed({ categoryId: 'general', title: '4' }))
  await addFeed(testFeed({ categoryId: 'unknown', title: '5' }))

  let page = openPage({
    params: {},
    route: 'export'
  })

  page.exportOpml()
  equal(page.exportingOpml.get(), true)
  equal(page.exportingBackup.get(), false)

  await waitLoading(page.exportingOpml)
  equal(saved?.filename, 'slowreader-rss-feeds.opml')
  let xml = await saved.content.text()
  equal(
    xml.replace(/ {4}<dateCreated>[^<]*<\/dateCreated>\n/, ''),
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<opml version="2.0">\n' +
      '  <head>\n' +
      '    <title>SlowReader Feeds</title>\n' +
      '  </head>\n' +
      '  <body>\n' +
      '    <outline text="4" type="rss" xmlUrl="http://example.com/4" />\n' +
      '    <outline text="A">\n' +
      '      <outline text="1" type="rss" xmlUrl="http://example.com/1" />\n' +
      '      <outline text="2" type="rss" xmlUrl="http://example.com/2" />\n' +
      '    </outline>\n' +
      '    <outline text="B">\n' +
      '      <outline text="3" type="rss" xmlUrl="http://example.com/3" />\n' +
      '    </outline>\n' +
      '    <outline text="5" type="rss" xmlUrl="http://example.com/5" />\n' +
      '  </body>\n' +
      '</opml>\n'
  )
})

test('export state JSON', async () => {
  let category = await addCategory({ title: 'A' })
  let feed = await addFeed(testFeed({ categoryId: category, title: '1' }))
  let filter = await addFilter({
    action: 'slow',
    feedId: feed,
    query: 'include(text)'
  })
  let post = await addPost(testPost({ feedId: feed }))

  let page = openPage({
    params: {},
    route: 'export'
  })

  page.exportBackup()
  equal(page.exportingOpml.get(), false)
  equal(page.exportingBackup.get(), true)

  await waitLoading(page.exportingBackup)
  equal(saved?.filename, 'slowreader.json')
  let json = JSON.parse(await saved.content.text())
  deepEqual(json, {
    categories: [
      {
        id: category,
        title: 'A'
      }
    ],
    feeds: [
      {
        categoryId: category,
        id: feed,
        loader: 'rss',
        reading: 'fast',
        title: '1',
        url: 'http://example.com/6'
      }
    ],
    filters: [
      {
        action: 'slow',
        feedId: feed,
        id: filter,
        priority: 100,
        query: 'include(text)'
      }
    ],
    posts: [
      {
        feedId: feed,
        id: post,
        intro: 'Post 1',
        media: [],
        originId: 'test-1',
        publishedAt: 1000,
        reading: 'fast',
        url: 'http://example.com/1'
      }
    ],
    settings: {
      preloadImages: 'always',
      theme: 'system',
      useQuietCursor: false,
      useReducedMotion: false
    }
  })
})

test('cancels export', async () => {
  let category = await addCategory({ title: 'A' })
  let feed = await addFeed(testFeed({ categoryId: category, title: '1' }))
  await addPost(testPost({ feedId: feed }))

  let page = openPage({
    params: {},
    route: 'export'
  })

  page.exportOpml()
  page.exportBackup()

  equal(page.exportingOpml.get(), true)
  equal(page.exportingBackup.get(), true)

  openPage({
    params: {},
    route: 'welcome'
  })
  await setTimeout(10)
  equal(saved, undefined)
})
