import './dom-parser.ts'

import { cleanStores } from 'nanostores'
import { deepStrictEqual, equal, ok } from 'node:assert'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  clearExportingSelections,
  exporting,
  exportingCategories,
  exportingFeeds,
  exportingFeedsByCategory,
  getInternalBlob,
  getOPMLBlob,
  handleImportFile,
  importedCategories,
  importedFeeds,
  importedFeedsByCategory,
  selectAllExportingFeeds,
  submitImport,
  toggleExportingCategory,
  toggleExportingFeed
} from '../index.ts'
import { cleanClientTest, enableClientTest } from './utils.ts'

async function loadFile(name: string): Promise<string> {
  let path = join(import.meta.dirname, 'fixtures', name)
  let content = await readFile(path, 'utf8')
  let file = new File([content], 'feeds.json', {
    type: 'application/json'
  })
  handleImportFile(file)
  await setTimeout(100)
  return content
}

beforeEach(async () => {
  enableClientTest()
  await loadFile('export.json')
  await submitImport()
})

afterEach(async () => {
  cleanStores(
    importedFeedsByCategory,
    importedCategories,
    importedFeeds,
    exportingFeedsByCategory,
    exporting,
    exportingCategories,
    exportingFeeds
  )
  await setTimeout(10)
  await cleanClientTest()
})

test('initializes with empty states', () => {
  deepStrictEqual(exportingFeedsByCategory.get(), [])
  deepStrictEqual(exportingCategories.get(), [])
  deepStrictEqual(exportingFeeds.get(), [])
  equal(exporting.get(), false)
})

test('selects all exporting feeds', () => {
  selectAllExportingFeeds()

  let categories = exportingCategories.get()
  let feeds = exportingFeeds.get()

  ok(categories.length > 0)
  ok(feeds.length > 0)
})

test('clears export selections', () => {
  selectAllExportingFeeds()
  clearExportingSelections()

  equal(exportingCategories.get().length, 0)
  equal(exportingFeeds.get().length, 0)
})

test('toggles exporting category', () => {
  let categoryId = 'general'
  clearExportingSelections()

  toggleExportingCategory(categoryId)
  ok(exportingCategories.get().includes(categoryId))
  ok(exportingFeeds.get().length > 0)

  toggleExportingCategory(categoryId)
  ok(!exportingCategories.get().includes(categoryId))
})

test('toggles exporting feed', () => {
  let feedId = 'H4RZpnXPjlj_Hzl08ipBw'
  let categoryId = 'general'
  clearExportingSelections()

  toggleExportingFeed(feedId, categoryId)
  ok(exportingFeeds.get().includes(feedId))
  ok(exportingCategories.get().includes(categoryId))

  toggleExportingFeed(feedId, categoryId)
  ok(!exportingFeeds.get().includes(feedId))
  ok(!exportingCategories.get().includes(categoryId))
})

test('generates OPML blob', async () => {
  selectAllExportingFeeds()
  let blob = getOPMLBlob()

  equal(blob.type, 'application/xml')
  let text = await blob.text()
  ok(text.includes('https://blog.appsignal.com/feed.xml'))
})

test('generates internal JSON blob', async () => {
  let blob = await getInternalBlob(true)
  equal(blob.type, 'application/json')
})
