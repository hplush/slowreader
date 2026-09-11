import { deepStrictEqual, equal, notEqual } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  addFeed,
  busy,
  isDemo,
  keepDemo,
  storageMessages,
  testFeed
} from '../../index.ts'
import {
  cleanClientTest,
  enableClientTest,
  openPage,
  waitUntil
} from '../utils.ts'

describe('storage page', () => {
  beforeEach(() => {
    enableClientTest()
  })

  afterEach(async () => {
    await cleanClientTest()
  })

  test('shows the database size', async () => {
    await addFeed(testFeed())

    let page = openPage({ params: {}, route: 'storage' })
    equal(page.hasCloud.get(), false)
    equal(page.size.get(), undefined)

    await waitUntil(() => typeof page.size.get() !== 'undefined')
    notEqual(page.size.get(), 0)
  })

  test('recalculates the size after leaving the demo', async () => {
    await addFeed(testFeed())
    isDemo.set(true)

    let page = openPage({ params: {}, route: 'storage' })
    await waitUntil(() => typeof page.size.get() !== 'undefined')

    keepDemo()
    equal(page.size.get(), undefined)

    await waitUntil(() => typeof page.size.get() !== 'undefined')
    notEqual(page.size.get(), 0)
  })

  test('exports the database file', async () => {
    let saved: { content: Blob; filename: string } | undefined
    enableClientTest({
      exportDatabase() {
        return Promise.resolve(new Blob(['SQLite format 3\0']))
      },
      saveFile(filename, content) {
        saved = { content, filename }
      }
    })

    let page = openPage({ params: {}, route: 'storage' })
    await waitUntil(() => typeof page.size.get() !== 'undefined')

    let exporting = page.exportDatabase!()
    deepStrictEqual(busy.get(), {
      blocking: true,
      label: storageMessages.get().exporting,
      progress: undefined
    })

    await exporting
    equal(busy.get(), false)
    equal(saved!.filename.startsWith('slowreader-'), true)
    equal(saved!.filename.endsWith('.sqlite'), true)
    equal(await saved!.content.text(), 'SQLite format 3\0')
  })

  test('has no export without the environment support', () => {
    let page = openPage({ params: {}, route: 'storage' })
    equal(page.exportDatabase, undefined)
  })

  test('compacts the database', async () => {
    await addFeed(testFeed())

    let page = openPage({ params: {}, route: 'storage' })
    await waitUntil(() => typeof page.size.get() !== 'undefined')

    let compacting = page.compact()
    deepStrictEqual(busy.get(), {
      blocking: true,
      label: storageMessages.get().compacting,
      progress: undefined
    })
    await compacting
    equal(busy.get(), false)
    notEqual(page.size.get(), 0)
  })
})
