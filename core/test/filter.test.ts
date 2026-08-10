import { withoutMeta } from '@logux/client/db'
import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  addFeed,
  addFilter,
  addFilterForFeed,
  type FilterValue,
  isValidFilterQuery,
  loadFeed,
  loadFiltersByFeed,
  moveFilterDown,
  moveFilterUp,
  prepareFilters,
  sortFilters,
  testFeed,
  withMeta
} from '../index.ts'
import { cleanClientTest, enableClientTest } from './utils.ts'

describe('filter', () => {
  beforeEach(() => {
    enableClientTest()
  })

  afterEach(async () => {
    await cleanClientTest()
  })

  test('adds filter for feed', async () => {
    let feedId1 = await addFeed(testFeed({ reading: 'fast' }))
    let feedId2 = await addFeed(testFeed({ reading: 'slow' }))

    let filterId1 = await addFilterForFeed((await loadFeed(feedId1))!)
    let filterId2 = await addFilterForFeed((await loadFeed(feedId2))!)

    deepEqual(withoutMeta(await loadFiltersByFeed(feedId1)), [
      {
        action: 'slow',
        feedId: feedId1,
        id: filterId1,
        priority: 100,
        query: ''
      }
    ])
    deepEqual(withoutMeta(await loadFiltersByFeed(feedId2)), [
      {
        action: 'fast',
        feedId: feedId2,
        id: filterId2,
        priority: 100,
        query: ''
      }
    ])
  })

  test('sorts filters', () => {
    let common = {
      action: 'fast',
      feedId: '10',
      query: 'include(some text)'
    } as const
    let filter100 = withMeta<FilterValue>({
      ...common,
      id: '100',
      priority: 100
    })
    let filter200a = withMeta<FilterValue>({
      ...common,
      id: '200',
      priority: 200
    })
    let filter200b = withMeta<FilterValue>({
      ...common,
      id: '400',
      priority: 200
    })
    let filter300 = withMeta<FilterValue>({
      ...common,
      id: '300',
      priority: 300
    })
    deepEqual(sortFilters([filter200a, filter300, filter100, filter200b]), [
      filter100,
      filter200a,
      filter200b,
      filter300
    ])
  })

  test('moves filters in sorting order', async () => {
    async function getSorted(): Promise<string[]> {
      return sortFilters(await loadFiltersByFeed('10')).map(i => i.id)
    }
    async function getPriorities(): Promise<Record<string, number>> {
      return Object.fromEntries(
        (await loadFiltersByFeed('10')).map(i => [i.id, i.priority])
      )
    }

    let common = {
      action: 'fast',
      feedId: '10',
      query: 'include(some text)'
    } as const

    let id1 = await addFilter({ ...common })
    let id2 = await addFilter({ ...common })
    let id3 = await addFilter({ ...common })
    deepEqual(await getSorted(), [id1, id2, id3])
    deepEqual(await getPriorities(), { [id1]: 100, [id2]: 200, [id3]: 300 })

    await moveFilterUp(id3)
    deepEqual(await getSorted(), [id1, id3, id2])
    deepEqual(await getPriorities(), { [id1]: 100, [id2]: 200, [id3]: 150 })

    await moveFilterUp(id3)
    deepEqual(await getSorted(), [id3, id1, id2])
    deepEqual(await getPriorities(), { [id1]: 100, [id2]: 200, [id3]: 0 })

    await moveFilterUp(id3)
    deepEqual(await getSorted(), [id3, id1, id2])
    deepEqual(await getPriorities(), { [id1]: 100, [id2]: 200, [id3]: 0 })

    await moveFilterDown(id1)
    deepEqual(await getSorted(), [id3, id2, id1])
    deepEqual(await getPriorities(), { [id1]: 300, [id2]: 200, [id3]: 0 })

    await moveFilterDown(id1)
    deepEqual(await getSorted(), [id3, id2, id1])
    deepEqual(await getPriorities(), { [id1]: 300, [id2]: 200, [id3]: 0 })
  })

  test('validates filter query', () => {
    equal(isValidFilterQuery(''), false)
    equal(isValidFilterQuery('strange'), false)
    equal(isValidFilterQuery('include'), false)
    equal(isValidFilterQuery('include()'), false)

    equal(isValidFilterQuery('include(some text)'), true)
    equal(isValidFilterQuery('not include(some text)'), true)

    equal(isValidFilterQuery(' include( some text ) '), true)
    equal(isValidFilterQuery('not  include(some text)'), true)
  })

  test('applies filters to posts', () => {
    let filterSpecial = withMeta<FilterValue>({
      action: 'slow',
      feedId: '10',
      id: '2',
      priority: 200,
      query: 'include(Special Text)'
    })
    let filterOther = withMeta<FilterValue>({
      action: 'delete',
      feedId: '10',
      id: '3',
      priority: 300,
      query: 'include(other text)'
    })
    let checker = prepareFilters([filterSpecial, filterOther])

    equal(
      checker({
        full: 'Some text',
        originId: '1'
      }),
      undefined
    )

    equal(
      checker({
        full: 'Special text',
        originId: '2'
      }),
      'slow'
    )

    equal(
      checker({
        full: 'Special text',
        originId: '3'
      }),
      'slow'
    )

    equal(
      checker({
        full: 'other text',
        originId: '4'
      }),
      'delete'
    )

    equal(
      checker({
        full: 'Some text',
        intro: 'other text',
        originId: '5'
      }),
      'delete'
    )

    equal(
      checker({
        full: 'Some text',
        intro: 'other text',
        originId: '6',
        title: 'some text'
      }),
      'delete'
    )

    equal(
      checker({
        full: 'special text',
        originId: '7',
        title: 'other text'
      }),
      'slow'
    )

    equal(
      checker({
        full: 'Some text',
        originId: '8'
      }),
      undefined
    )
  })

  test('supports not in filters', () => {
    let filterA = withMeta<FilterValue>({
      action: 'fast',
      feedId: '10',
      id: '1',
      priority: 100,
      query: 'include(a)'
    })
    let filterNotB = withMeta<FilterValue>({
      action: 'slow',
      feedId: '10',
      id: '2',
      priority: 200,
      query: 'not include(b)'
    })
    let checker = prepareFilters([filterA, filterNotB])

    equal(
      checker({
        full: 'a',
        originId: 'a'
      }),
      'fast'
    )

    equal(
      checker({
        full: 'a b',
        originId: 'a b'
      }),
      'fast'
    )

    equal(
      checker({
        full: 'c b',
        intro: 'other text',
        originId: 'c b'
      }),
      undefined
    )

    equal(
      checker({
        full: 'c',
        intro: 'other text',
        originId: 'c',
        title: 'some text'
      }),
      'slow'
    )
  })

  test('is ready for broken filters', () => {
    let filterA = withMeta<FilterValue>({
      action: 'fast',
      feedId: '10',
      id: '1',
      priority: 100,
      query: 'broken'
    })
    let filterNotB = withMeta<FilterValue>({
      action: 'slow',
      feedId: '10',
      id: '2',
      priority: 200,
      query: 'include(a)'
    })
    let checker = prepareFilters([filterA, filterNotB])

    equal(
      checker({
        full: 'a',
        originId: 'a'
      }),
      'slow'
    )

    equal(
      checker({
        full: 'b',
        originId: 'b'
      }),
      undefined
    )
  })
})
