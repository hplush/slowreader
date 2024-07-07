import './dom-parser.js'

import { cleanStores } from 'nanostores'
import { deepStrictEqual, equal } from 'node:assert'
import { readFile } from 'node:fs/promises'
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
  submiting,
  toggleExportingCategory,
  toggleExportingFeed
} from '../index.js'
import { cleanClientTest, enableClientTest } from './utils.js'

async function loadFile(filePath: string): Promise<string> {
  let jsonContent = await readFile(filePath, 'utf8')
  let jsonFile = new File([jsonContent], 'feeds.json', {
    type: 'application/json'
  })
  handleImportFile(jsonFile)
  await setTimeout(100)

  return jsonContent
}

beforeEach(async () => {
  enableClientTest()
  await loadFile('test/export-internal-example.json')
  await submitImport()
})

afterEach(async () => {
  cleanStores(
    importedFeedsByCategory,
    importedCategories,
    importedFeeds,
    submiting,
    exportingFeedsByCategory,
    exporting,
    exportingCategories,
    exportingFeeds
  )
  await setTimeout(10)
  await cleanClientTest()
})

test('should initialize with empty states', () => {
  deepStrictEqual(exportingFeedsByCategory.get(), [])
  deepStrictEqual(exportingCategories.get(), [])
  deepStrictEqual(exportingFeeds.get(), [])
  equal(exporting.get(), false)
})

test('should select all exporting feeds', async () => {
  selectAllExportingFeeds()

  let categories = exportingCategories.get()
  let feeds = exportingFeeds.get()

  equal(categories.length > 0, true)
  equal(feeds.length > 0, true)
})

test('should clear export selections', async () => {
  selectAllExportingFeeds()
  clearExportingSelections()

  equal(exportingCategories.get().length, 0)
  equal(exportingFeeds.get().length, 0)
})

test('should toggle exporting category', async () => {
  let categoryId = '1GfRaXZCKbgtjuSnfzeew'

  clearExportingSelections()

  toggleExportingCategory(categoryId)

  let selectedCategories = exportingCategories.get()
  let selectedFeeds = exportingFeeds.get()

  equal(selectedCategories.includes(categoryId), true)
  equal(selectedFeeds.length > 0, true)

  toggleExportingCategory(categoryId)

  selectedCategories = exportingCategories.get()
  equal(selectedCategories.includes(categoryId), false)
})

test('should toggle exporting feed', async () => {
  let feedId = 'H4RZpnXPjlj_Hzl08ipBw'
  let categoryId = 'general'

  clearExportingSelections()

  toggleExportingFeed(feedId, categoryId)

  let selectedFeeds = exportingFeeds.get()
  let selectedCategories = exportingCategories.get()

  equal(selectedFeeds.includes(feedId), true)
  equal(selectedCategories.includes(categoryId), true)

  toggleExportingFeed(feedId, categoryId)

  selectedFeeds = exportingFeeds.get()
  selectedCategories = exportingCategories.get()

  equal(selectedFeeds.includes(feedId), false)
  equal(selectedCategories.includes(categoryId), false)
})

test('should generate OPML blob', async () => {
  selectAllExportingFeeds()
  let blob = getOPMLBlob()

  equal(blob.type, 'application/xml')
  let text = await blob.text()
  equal(text.includes('https://blog.appsignal.com/feed.xml'), true)
})

test('should generate internal JSON blob', async () => {
  let blob = await getInternalBlob(true)
  equal(blob.type, 'application/json')
})
