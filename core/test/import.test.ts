import './dom-parser.ts'

import { cleanStores } from 'nanostores'
import { deepStrictEqual, equal, ok } from 'node:assert'
import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
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
  importReading,
  importUnLoadedFeeds,
  loadFeeds,
  mockRequest,
  selectAllImportedFeeds,
  submitImport,
  submiting,
  toggleImportedCategory,
  toggleImportedFeed
} from '../index.ts'
import { cleanClientTest, enableClientTest } from './utils.ts'

async function importFile(name: string): Promise<string> {
  let path = join(import.meta.dirname, 'fixtures', name)
  let content = await readFile(path, 'utf8')
  let json = extname(path) === '.json'
  let file = new File([content], json ? 'feeds.json' : 'feeds.opml', {
    type: json ? 'application/json' : 'application/xml'
  })
  handleImportFile(file)
  await setTimeout(100)
  return content
}

function createFile(content: string, name: string, type: string): File {
  return new File([content], name, { type })
}

beforeEach(() => {
  enableClientTest()
  mockRequest()
})

let originalDOMParser = global.DOMParser
let originalParse = JSON.parse

afterEach(async () => {
  cleanStores(
    importedFeedsByCategory,
    importedCategories,
    importedFeeds,
    importReading,
    submiting,
    importUnLoadedFeeds,
    importErrors
  )
  await setTimeout(10)
  await cleanClientTest()
  checkAndRemoveRequestMock()
  global.DOMParser = originalDOMParser
  JSON.parse = originalParse
})

test('initializes with empty states', () => {
  deepStrictEqual(importedFeedsByCategory.get(), [])
  deepStrictEqual(importedCategories.get(), [])
  deepStrictEqual(importedFeeds.get(), [])
  deepStrictEqual(importUnLoadedFeeds.get(), [])
  deepStrictEqual(importErrors.get(), [])
  equal(importReading.get(), false)
  equal(submiting.get(), false)
})

test('imports a OPML file', async () => {
  expectRequest('https://a.com/atom').andRespond(
    200,
    '<feed><title>Atom</title>' +
      '<entry><id>2</id><updated>2023-07-01T00:00:00Z</updated></entry>' +
      '<entry><id>1</id><updated>2023-06-01T00:00:00Z</updated></entry>' +
      '</feed>',
    'text/xml'
  )

  await importFile('export.opml')
  ok(Object.keys(importLoadingFeeds.get()).includes('https://a.com/atom'))
  ok(importedCategories.get().includes('general'))
  equal(importErrors.get().length, 0)
})

test('imports a JSON file', async () => {
  let fileContent = await importFile('export.json')
  deepStrictEqual(importedFeedsByCategory.get(), JSON.parse(fileContent).data)
  ok(importedCategories.get().includes('general'))
  equal(importedCategories.get().length, 3)
  deepStrictEqual(importedFeeds.get(), [
    'xCy25SYTs6Li1YQTpl7fD',
    '1Fy7b2rJg1LSx1kVPzzOH',
    'jD_nlLbSIo5Eabo0LRkCs'
  ])
  equal(importErrors.get().length, 0)
})

test('handles invalid file format', async () => {
  let invalidFile = new File([''], 'invalid.format')

  await handleImportFile(invalidFile)
  await setTimeout(100) // Wait for importErrors to be updated

  deepStrictEqual(importErrors.get(), ['Unsupported file format'])
})

test('handles invalid OPML format', async () => {
  let invalidOpmlFile = new File(['<opml><invalid></opml>'], 'invalid.opml', {
    type: 'text/xml'
  })

  await handleImportFile(invalidOpmlFile)
  await setTimeout(100) // Wait for importErrors to be updated

  deepStrictEqual(importErrors.get(), ['File is not in OPML format'])
})

test('handles invalid JSON format', async () => {
  let invalidJsonFile = new File(['{"invalid": true}'], 'invalid.json', {
    type: 'application/json'
  })

  await handleImportFile(invalidJsonFile)
  await setTimeout(100) // Wait for importErrors to be updated

  deepStrictEqual(importErrors.get(), ['Invalid JSON structure'])
})

test('selects all imported feeds', async () => {
  await importFile('export.json')
  selectAllImportedFeeds()

  let categories = importedCategories.get()
  let feeds = importedFeeds.get()

  equal(categories.length, 3)
  equal(feeds.length, 3)
})

test('clears import selections', async () => {
  await importFile('export.json')
  selectAllImportedFeeds()
  clearImportSelections()

  equal(importedCategories.get().length, 0)
  equal(importedFeeds.get().length, 0)
})

test('toggles imported category', async () => {
  await importFile('export.json')
  let categoryId = 'general'

  clearImportSelections()

  toggleImportedCategory(categoryId)

  ok(importedCategories.get().includes(categoryId))
  equal(importedFeeds.get().length, 1)

  toggleImportedCategory(categoryId)
  ok(!importedCategories.get().includes(categoryId))
  equal(importedFeeds.get().length, 0)
})

test('toggles imported feed', async () => {
  await importFile('export.json')
  let feedId = 'xCy25SYTs6Li1YQTpl7fD'
  let categoryId = 'general'

  clearImportSelections()

  toggleImportedFeed(feedId, categoryId)

  ok(importedFeeds.get().includes(feedId))
  ok(importedCategories.get().includes(categoryId))

  toggleImportedFeed(feedId, categoryId)
  ok(!importedFeeds.get().includes(feedId))
  ok(!importedCategories.get().includes(categoryId))
})

test('imports file and set states', async () => {
  await importFile('export.json')

  ok(importedFeedsByCategory.get().length > 0)
  ok(importedCategories.get().length > 0)
  ok(importedFeeds.get().length > 0)
  equal(importErrors.get().length, 0)
})

test('submits import and clear states and feeds imported', async () => {
  await importFile('export.json')
  await submitImport()
  let feeds = await loadFeeds()

  equal(importedFeedsByCategory.get().length, 0)
  equal(feeds.length, 3)
  equal(importErrors.get().length, 0)
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

  ok(categories.includes('general'))
  equal(importErrors.get().length, 0)
})

test('handles invalid JSON structure', async () => {
  let invalidJsonStructureFile = new File(
    ['{"type": "invalidStructure"}'],
    'invalid.json',
    { type: 'application/json' }
  )

  await handleImportFile(invalidJsonStructureFile)
  await setTimeout(100)

  deepStrictEqual(importErrors.get(), ['Invalid JSON structure'])
})

test('handles invalid OPML XML format', async () => {
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
  await setTimeout(100)

  deepStrictEqual(importErrors.get(), ['File is not in OPML format'])
})

test('handles unexpected errors', async () => {
  let faultyFile = createFile('', 'faulty.json', 'application/json')

  JSON.parse = () => {
    throw new Error('Unexpected error')
  }

  await handleImportFile(faultyFile)
  await setTimeout(100)

  deepStrictEqual(importErrors.get(), [
    'Failed to parse JSON or invalid structure'
  ])
})
