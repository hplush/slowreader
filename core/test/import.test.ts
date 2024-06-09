import './dom-parser.js'
import { cleanStores } from 'nanostores'
import { deepStrictEqual, equal, rejects } from 'node:assert'
import { readFile } from 'node:fs/promises'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  clearImportSelections,
  feedsByCategory,
  handleImportFile,
  importedCategories,
  importedFeeds,
  importedFeedsByCategory,
  loadFeeds,
  reading,
  selectAllImportedFeeds,
  submitImport,
  submiting,
  toggleImportedCategory,
  toggleImportedFeed,
  unLoadedFeeds
} from '../index.js'
import { cleanClientTest, enableClientTest } from './utils.js'

async function loadFile(filePath: string): Promise<string> {
  const fileExtension = filePath.split('.').pop()

  let fileContent = await readFile(filePath, 'utf8')
  let fileInstance = new File([fileContent], 'feeds.json', {
    type: 'application/json'
  })

  if (fileExtension === 'json') {
    fileContent = await readFile(filePath, 'utf8')
    fileInstance = new File([fileContent], 'feeds.json', {
      type: 'application/json'
    })
    handleImportFile(fileInstance)
    await setTimeout(100)
    return fileContent
  } else if (fileExtension === 'opml') {
    fileContent = await readFile(filePath, 'utf8')
    fileInstance = new File([fileContent], 'feeds.opml', {
      type: 'application/xml'
    })
    handleImportFile(fileInstance)
    await setTimeout(100)
    return fileContent
  } else {
    throw new Error(
      'Unsupported file format. Please upload a .json or .opml file.'
    )
  }
}

function createFile(content: string, name: string, type: string): File {
  return new File([content], name, { type })
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

test('should handle importing a opml file', async () => {
  await loadFile('../loader-tests/export-opml-example.opml')

  deepStrictEqual(importedCategories.get().includes('general'), true)
})

test('should handle importing a JSON file', async () => {
  let fileContent = await loadFile(
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

test('should handle invalid file format', async () => {
  const invalidFile = new File([''], 'invalid.format')

  await rejects(async () => {
    await handleImportFile(invalidFile)
  }, new Error('Unsupported file format'))
})

test('should handle invalid OPML format', async () => {
  const invalidOpmlFile = new File(['<opml><invalid></opml>'], 'invalid.opml', {
    type: 'text/xml'
  })

  await rejects(async () => {
    await handleImportFile(invalidOpmlFile)
  }, new Error('File is not in OPML format'))
})

test('should handle invalid JSON format', async () => {
  const invalidOpmlFile = new File(['{"invalid": true}'], 'invalid.json', {
    type: 'application/json'
  })

  await rejects(async () => {
    await handleImportFile(invalidOpmlFile)
  }, new Error('Failed to parse JSON or invalid structure'))
})

test('should select all imported feeds', async () => {
  await loadFile('../loader-tests/export-internal-example.json')
  selectAllImportedFeeds()

  let categories = importedCategories.get()
  let feeds = importedFeeds.get()

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
  let categoryId = '1GfRaXZCKbgtjuSnfzeew'

  clearImportSelections()

  toggleImportedCategory(categoryId)

  equal(importedCategories.get().includes(categoryId), true)
  equal(importedFeeds.get().length, 2)

  toggleImportedCategory(categoryId)
  equal(importedCategories.get().includes(categoryId), false)
  equal(importedFeeds.get().length, 0)
})

test('should toggle imported feed', async () => {
  await loadFile('../loader-tests/export-internal-example.json')
  let feedId = 'H4RZpnXPjlj_Hzl08ipBw'
  let categoryId = 'general'

  clearImportSelections()

  toggleImportedFeed(feedId, categoryId)

  equal(importedFeeds.get().includes(feedId), true)
  equal(importedCategories.get().includes(categoryId), true)

  toggleImportedFeed(feedId, categoryId)
  equal(importedFeeds.get().includes(feedId), false)
  equal(importedCategories.get().includes(categoryId), false)
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

test('should handle OPML without General category', async () => {
  const opmlContentWithoutGeneral = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
<head>
<title>Feeds</title>
</head>
<body>

<outline text="custom category">
<outline text="Ferd.ca" type="rss" xmlUrl="https://ferd.ca/feed.rss" />
<outline text="Hauleth's blog" type="atom" xmlUrl="https://hauleth.dev/atom.xml" />
</outline>
<outline text="AppSignal" type="atom" xmlUrl="https://blog.appsignal.com/feed.xml" />
<outline text="Bartosz Ciechanowski" type="rss" xmlUrl="https://ciechanow.ski/atom.xml" />
</body>
</opml>
`

  const fileWithoutGeneral = createFile(
    opmlContentWithoutGeneral,
    'withoutGeneral.opml',
    'text/xml'
  )
  await handleImportFile(fileWithoutGeneral)
  await setTimeout(1000)

  const categories = importedCategories.get()

  equal(categories.includes('general'), true)
})
