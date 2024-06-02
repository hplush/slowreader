import { deepStrictEqual, equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'
import { readFile } from 'fs/promises'
import './dom-parser.js'

import {
  importedFeedsByCategory,
  importedCategories,
  importedFeeds,
  reading,
  submiting,
  unLoadedFeeds,
  selectAllImportedFeeds,
  clearImportSelections,
  toggleImportedCategory,
  toggleImportedFeed,
  handleImportFile,
  submitImport,
  loadFeeds
} from '../index.js'
import {
  feedsByCategoryList,
  creating,
  exportedCategories,
  exportedFeeds,
  selectAllExportedFeeds,
  clearExportedSelections,
  getOPMLBlob,
  getInternalBlob,
  toggleExportedCategory,
  toggleExportedFeed
} from '../index.js'
import { cleanStores } from 'nanostores'
import { enableClientTest, cleanClientTest } from './utils.js'
import path from 'node:path'
import { addCategory, type FeedsByCategory } from '../category.js'
import { addFeed } from '../feed.js'
import { loadValue } from '@logux/client'
import { getPosts, type PostValue } from '../post.js'

async function loadFile(filePath: string): Promise<string> {
  const jsonContent = await readFile(filePath, 'utf8')
  const jsonFile = new File([jsonContent], 'feeds.json', {
    type: 'application/json'
  })
  await handleImportFile(jsonFile)
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

  const categories = exportedCategories.get()
  const feeds = exportedFeeds.get()

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
  const categoryId = '1GfRaXZCKbgtjuSnfzeew'

  clearExportedSelections()

  toggleExportedCategory(categoryId)

  const selectedCategories = exportedCategories.get()
  const selectedFeeds = exportedFeeds.get()

  equal(selectedCategories.includes(categoryId), true)
  equal(selectedFeeds.length > 0, true)
})

test('should toggle exported feed', async () => {
  const feedId = 'H4RZpnXPjlj_Hzl08ipBw'
  const categoryId = 'general'

  clearExportedSelections()

  toggleExportedFeed(feedId, categoryId)

  const selectedFeeds = exportedFeeds.get()
  const selectedCategories = exportedCategories.get()

  equal(selectedFeeds.includes(feedId), true)
  equal(selectedCategories.includes(categoryId), true)
})

test('should generate OPML blob', () => {
  const blob = getOPMLBlob()
  equal(blob.type, 'application/xml')
})

test('should generate internal JSON blob', async () => {
  const blob = await getInternalBlob(true)
  equal(blob.type, 'application/json')
})
