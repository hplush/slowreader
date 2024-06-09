import './dom-parser.js'

import { cleanStores } from 'nanostores'
import { deepStrictEqual, equal } from 'node:assert'
import { readFile } from 'node:fs/promises'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  clearExportedSelections,
  creating,
  exportedCategories,
  exportedFeeds,
  feedsByCategoryList,
  getInternalBlob,
  getOPMLBlob,
  handleImportFile,
  importedCategories,
  importedFeeds,
  importedFeedsByCategory,
  reading,
  selectAllExportedFeeds,
  submitImport,
  submiting,
  toggleExportedCategory,
  toggleExportedFeed,
  unLoadedFeeds
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
  await loadFile('../loader-tests/export-internal-example.json')
  await submitImport()
})

afterEach(async () => {
  cleanStores(
    importedFeedsByCategory,
    importedCategories,
    importedFeeds,
    reading,
    submiting,
    unLoadedFeeds,
    feedsByCategoryList,
    creating,
    exportedCategories,
    exportedFeeds
  )
  await setTimeout(10)
  await cleanClientTest()
})

test('should initialize with empty states', () => {
  deepStrictEqual(feedsByCategoryList.get(), [])
  deepStrictEqual(exportedCategories.get(), [])
  deepStrictEqual(exportedFeeds.get(), [])
  equal(creating.get(), false)
})

test('should select all exported feeds', async () => {
  selectAllExportedFeeds()

  let categories = exportedCategories.get()
  let feeds = exportedFeeds.get()

  equal(categories.length > 0, true)
  equal(feeds.length > 0, true)
})

test('should clear export selections', async () => {
  selectAllExportedFeeds()
  clearExportedSelections()

  equal(exportedCategories.get().length, 0)
  equal(exportedFeeds.get().length, 0)
})

test('should toggle exported category', async () => {
  let categoryId = '1GfRaXZCKbgtjuSnfzeew'

  clearExportedSelections()

  toggleExportedCategory(categoryId)

  let selectedCategories = exportedCategories.get()
  let selectedFeeds = exportedFeeds.get()

  equal(selectedCategories.includes(categoryId), true)
  equal(selectedFeeds.length > 0, true)

  toggleExportedCategory(categoryId)

  selectedCategories = exportedCategories.get()
  equal(selectedCategories.includes(categoryId), false)
})

test('should toggle exported feed', async () => {
  let feedId = 'H4RZpnXPjlj_Hzl08ipBw'
  let categoryId = 'general'

  clearExportedSelections()

  toggleExportedFeed(feedId, categoryId)

  let selectedFeeds = exportedFeeds.get()
  let selectedCategories = exportedCategories.get()

  equal(selectedFeeds.includes(feedId), true)
  equal(selectedCategories.includes(categoryId), true)

  toggleExportedFeed(feedId, categoryId)

  selectedFeeds = exportedFeeds.get()
  selectedCategories = exportedCategories.get()

  equal(selectedFeeds.includes(feedId), false)
  equal(selectedCategories.includes(categoryId), false)
})

test('should generate OPML blob', async () => {
  selectAllExportedFeeds()
  let blob = getOPMLBlob()

  equal(blob.type, 'application/xml')
  const text = await blob.text()
  equal(text.includes('https://blog.appsignal.com/feed.xml'), true)
})

test('should generate internal JSON blob', async () => {
  let blob = await getInternalBlob(true)
  equal(blob.type, 'application/json')
})
