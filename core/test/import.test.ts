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
import { cleanStores } from 'nanostores'
import { enableClientTest, cleanClientTest } from './utils.js'
import path from 'node:path'
import { addCategory, type FeedsByCategory } from '../category.js'
import { addFeed } from '../feed.js'

async function loadFile(filePath: string): Promise<string> {
  const jsonContent = await readFile(filePath, 'utf8')
  const jsonFile = new File([jsonContent], 'feeds.json', {
    type: 'application/json'
  })
  await handleImportFile(jsonFile)
  await setTimeout(100)

  return jsonContent
}

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  cleanStores(
    importedFeedsByCategory,
    importedCategories,
    importedFeeds,
    reading,
    submiting,
    unLoadedFeeds
  )
  await setTimeout(10)
  await cleanClientTest()
})

test('should initialize with empty states', () => {
  deepStrictEqual(importedFeedsByCategory.get(), [])
  deepStrictEqual(importedCategories.get(), [])
  deepStrictEqual(importedFeeds.get(), [])
  deepStrictEqual(unLoadedFeeds.get(), [])
  equal(reading.get(), false)
  equal(submiting.get(), false)
})

test('should handle importing a JSON file', async () => {
  const fileContent = await loadFile(
    '../loader-tests/export-internal-example.json'
  )

  deepStrictEqual(importedFeedsByCategory.get(), JSON.parse(fileContent).data)
  deepStrictEqual(importedCategories.get(), [
    'general',
    '1GfRaXZCKbgtjuSnfzeew'
  ])
  deepStrictEqual(importedFeeds.get(), [
    'H4RZpnXPjlj_Hzl08ipBw',
    'N6DAT82NAp_w7E1ccIlRp',
    'BEKaXZ5-XScobcV0hKc4I',
    'qR4_med2A8z-N88MZsU6P'
  ])
})

test('should select all imported feeds', async () => {
  await loadFile('../loader-tests/export-internal-example.json')
  selectAllImportedFeeds()

  const categories = importedCategories.get()
  const feeds = importedFeeds.get()

  equal(categories.length, 2)
  equal(feeds.length, 4)
})

test('should clear import selections', async () => {
  await loadFile('../loader-tests/export-internal-example.json')
  selectAllImportedFeeds()
  clearImportSelections()

  equal(importedCategories.get().length, 0)
  equal(importedFeeds.get().length, 0)
})

test('should toggle imported category', async () => {
  await loadFile('../loader-tests/export-internal-example.json')
  const categoryId = '1GfRaXZCKbgtjuSnfzeew'

  clearImportSelections()

  toggleImportedCategory(categoryId)

  const selectedCategories = importedCategories.get()
  const selectedFeeds = importedFeeds.get()

  equal(selectedCategories.includes(categoryId), true)
  equal(selectedFeeds.length, 2)
})

test('should toggle imported feed', async () => {
  await loadFile('../loader-tests/export-internal-example.json')
  const feedId = 'H4RZpnXPjlj_Hzl08ipBw'
  const categoryId = 'general'

  clearImportSelections()

  toggleImportedFeed(feedId, categoryId)

  const selectedFeeds = importedFeeds.get()
  const selectedCategories = importedCategories.get()

  equal(selectedFeeds.includes(feedId), true)
  equal(selectedCategories.includes(categoryId), true)
})

test('should handle import file and set states', async () => {
  await loadFile('../loader-tests/export-internal-example.json')

  deepStrictEqual(importedFeedsByCategory.get().length > 0, true)
  deepStrictEqual(importedCategories.get().length > 0, true)
  deepStrictEqual(importedFeeds.get().length > 0, true)
})

test('should submit import and clear states and feeds imported', async () => {
  await loadFile('../loader-tests/export-internal-example.json')
  await submitImport()
  let feeds = await loadFeeds()

  deepStrictEqual(importedFeedsByCategory.get().length, 0)
  equal(feeds.length, 4)
})

test('should handle invalid JSON file', async () => {
  const invalidJsonContent = '{"invalidJson": true}'
  const invalidJsonFile = new File([invalidJsonContent], 'invalid.json', {
    type: 'application/json'
  })

  await handleImportFile(invalidJsonFile)
  await setTimeout(100)

  deepStrictEqual(importedFeedsByCategory.get(), [])
  deepStrictEqual(importedCategories.get(), [])
  deepStrictEqual(importedFeeds.get(), [])
})
