import './dom-parser.js'

import { cleanStores } from 'nanostores'
import { deepStrictEqual, equal } from 'node:assert'
import { readFile } from 'node:fs/promises'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  checkAndRemoveRequestMock,
  clearImportSelections,
  expectRequest,
  handleImportFile,
  importedCategories,
  importedFeeds,
  importedFeedsByCategory,
  importErrors,
  importLoadingFeeds,
  loadFeeds,
  mockRequest,
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
  let fileExtension = filePath.split('.').pop()

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
  mockRequest()
})

afterEach(async () => {
  cleanStores(
    importedFeedsByCategory,
    importedCategories,
    importedFeeds,
    reading,
    submiting,
    unLoadedFeeds,
    importErrors
  )
  await setTimeout(10)
  await cleanClientTest()
  checkAndRemoveRequestMock()
})

test('should initialize with empty states', () => {
  deepStrictEqual(importedFeedsByCategory.get(), [])
  deepStrictEqual(importedCategories.get(), [])
  deepStrictEqual(importedFeeds.get(), [])
  deepStrictEqual(unLoadedFeeds.get(), [])
  deepStrictEqual(importErrors.get(), [])
  equal(reading.get(), false)
  equal(submiting.get(), false)
})

test('should handle importing a opml file', async () => {
  expectRequest('https://a.com/atom').andRespond(
    200,
    '<feed><title>Atom</title>' +
      '<entry><id>2</id><updated>2023-07-01T00:00:00Z</updated></entry>' +
      '<entry><id>1</id><updated>2023-06-01T00:00:00Z</updated></entry>' +
      '</feed>',
    'text/xml'
  )

  loadFile('test/export-opml-example.opml')

  await setTimeout(100)
  deepStrictEqual(
    Object.keys(importLoadingFeeds.get()).includes('https://a.com/atom'),
    true
  )
  deepStrictEqual(importedCategories.get().includes('general'), true)
  deepStrictEqual(importErrors.get().length, 0)
})

test('should handle importing a JSON file', async () => {
  let fileContent = await loadFile('test/export-internal-example.json')
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
  deepStrictEqual(importErrors.get().length, 0)
})

test('should handle invalid file format', async () => {
  let invalidFile = new File([''], 'invalid.format')

  await handleImportFile(invalidFile)
  await setTimeout(100) // Wait for importErrors to be updated

  deepStrictEqual(importErrors.get(), ['Unsupported file format'])
})

test('should handle invalid OPML format', async () => {
  let invalidOpmlFile = new File(['<opml><invalid></opml>'], 'invalid.opml', {
    type: 'text/xml'
  })

  await handleImportFile(invalidOpmlFile)
  await setTimeout(100) // Wait for importErrors to be updated

  deepStrictEqual(importErrors.get(), ['File is not in OPML format'])
})

test('should handle invalid JSON format', async () => {
  let invalidJsonFile = new File(['{"invalid": true}'], 'invalid.json', {
    type: 'application/json'
  })

  await handleImportFile(invalidJsonFile)
  await setTimeout(100) // Wait for importErrors to be updated

  deepStrictEqual(importErrors.get(), ['Invalid JSON structure'])
})

test('should select all imported feeds', async () => {
  await loadFile('test/export-internal-example.json')
  selectAllImportedFeeds()

  let categories = importedCategories.get()
  let feeds = importedFeeds.get()

  equal(categories.length, 2)
  equal(feeds.length, 4)
})

test('should clear import selections', async () => {
  await loadFile('test/export-internal-example.json')
  selectAllImportedFeeds()
  clearImportSelections()

  equal(importedCategories.get().length, 0)
  equal(importedFeeds.get().length, 0)
})

test('should toggle imported category', async () => {
  await loadFile('test/export-internal-example.json')
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
  await loadFile('test/export-internal-example.json')
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
  await loadFile('test/export-internal-example.json')

  deepStrictEqual(importedFeedsByCategory.get().length > 0, true)
  deepStrictEqual(importedCategories.get().length > 0, true)
  deepStrictEqual(importedFeeds.get().length > 0, true)
  deepStrictEqual(importErrors.get().length, 0)
})

test('should submit import and clear states and feeds imported', async () => {
  await loadFile('test/export-internal-example.json')
  await submitImport()
  let feeds = await loadFeeds()

  deepStrictEqual(importedFeedsByCategory.get().length, 0)
  equal(feeds.length, 4)
  deepStrictEqual(importErrors.get().length, 0)
})

test('should handle OPML without General category', async () => {
  let opmlContentWithoutGeneral = `<?xml version="1.0" encoding="UTF-8"?>
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

  let fileWithoutGeneral = createFile(
    opmlContentWithoutGeneral,
    'withoutGeneral.opml',
    'text/xml'
  )
  await handleImportFile(fileWithoutGeneral)
  await setTimeout(1000)

  let categories = importedCategories.get()

  equal(categories.includes('general'), true)
  deepStrictEqual(importErrors.get().length, 0)
})

test('should handle invalid JSON structure', async () => {
  let invalidJsonStructureFile = new File(
    ['{"type": "invalidStructure"}'],
    'invalid.json',
    { type: 'application/json' }
  )

  await handleImportFile(invalidJsonStructureFile)
  await setTimeout(100)

  deepStrictEqual(importErrors.get(), ['Invalid JSON structure'])
})

test('should handle invalid OPML XML format', async () => {
  let originalDOMParser = global.DOMParser

  global.DOMParser = class {
    parseFromString(): never {
      throw new Error('Parsing error')
    }
  } as any
  ;(global as any).DOMParser = class {
    parseFromString(): Document {
      throw new Error('Parsing error')
    }
  }

  let invalidOpmlFile = new File(
    ['<opml><invalid></invalid>'],
    'invalid.opml',
    {
      type: 'text/xml'
    }
  )

  await handleImportFile(invalidOpmlFile)
  await setTimeout(100) // Wait for importErrors to be updated

  deepStrictEqual(importErrors.get(), ['File is not in OPML format'])

  global.DOMParser = originalDOMParser
})

test('should handle unexpected errors', async () => {
  let faultyFile = createFile('', 'faulty.json', 'application/json')

  let originalParse = JSON.parse
  JSON.parse = () => {
    throw new Error('Unexpected error')
  }

  await handleImportFile(faultyFile)
  await setTimeout(100)

  deepStrictEqual(importErrors.get(), [
    'Failed to parse JSON or invalid structure'
  ])

  JSON.parse = originalParse
})
