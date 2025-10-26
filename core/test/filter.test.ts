import { ensureLoaded, loadValue } from '@logux/client'
import { keepMount } from 'nanostores'
import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'

import {
  addFeed,
  addFilter,
  addFilterForFeed,
  type FilterValue,
  getFeed,
  getFilters,
  isValidFilterQuery,
  moveFilterDown,
  moveFilterUp,
  prepareFilters,
  sortFilters,
  testFeed
} from '../index.ts'
import { cleanClientTest, enableClientTest } from './utils.ts'

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  await cleanClientTest()
})

test('adds filter for feed', async () => {
  let feedId1 = await addFeed(testFeed({ reading: 'fast' }))
  let feedId2 = await addFeed(testFeed({ reading: 'slow' }))

  let filterId1 = await addFilterForFeed((await loadValue(getFeed(feedId1)))!)
  let filterId2 = await addFilterForFeed((await loadValue(getFeed(feedId2)))!)

  deepEqual((await loadValue(getFilters({ feedId: feedId1 }))).list, [
    {
      action: 'slow',
      feedId: feedId1,
      id: filterId1,
      isLoading: false,
      priority: 100,
      query: ''
    }
  ])
  deepEqual((await loadValue(getFilters({ feedId: feedId2 }))).list, [
    {
      action: 'fast',
      feedId: feedId2,
      id: filterId2,
      isLoading: false,
      priority: 100,
      query: ''
    }
  ])
})

test('sorts filters', () => {
  let common = {
    action: 'fast',
    feedId: '10',
    isLoading: false,
    query: 'include(some text)'
  } as const
  let filter100: FilterValue = {
    ...common,
    id: '100',
    priority: 100
  }
  let filter200a: FilterValue = {
    ...common,
    id: '200',
    priority: 200
  }
  let filter200b: FilterValue = {
    ...common,
    id: '400',
    priority: 200
  }
  let filter300: FilterValue = {
    ...common,
    id: '300',
    priority: 300
  }
  deepEqual(sortFilters([filter200a, filter300, filter100, filter200b]), [
    filter100,
    filter200a,
    filter200b,
    filter300
  ])
})

test('moves filters in sorting order', async () => {
  let filters10 = getFilters({ feedId: '10' })
  keepMount(filters10)
  function getSorted(): string[] {
    return sortFilters(ensureLoaded(filters10.get()).list).map(i => i.id)
  }
  function getPriorities(): Record<string, number> {
    return Object.fromEntries(
      ensureLoaded(filters10.get()).list.map(i => [i.id, i.priority])
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
  deepEqual(getSorted(), [id1, id2, id3])
  deepEqual(getPriorities(), { [id1]: 100, [id2]: 200, [id3]: 300 })

  await moveFilterUp(id3)
  deepEqual(getSorted(), [id1, id3, id2])
  deepEqual(getPriorities(), { [id1]: 100, [id2]: 200, [id3]: 150 })

  await moveFilterUp(id3)
  deepEqual(getSorted(), [id3, id1, id2])
  deepEqual(getPriorities(), { [id1]: 100, [id2]: 200, [id3]: 0 })

  await moveFilterUp(id3)
  deepEqual(getSorted(), [id3, id1, id2])
  deepEqual(getPriorities(), { [id1]: 100, [id2]: 200, [id3]: 0 })

  await moveFilterDown(id1)
  deepEqual(getSorted(), [id3, id2, id1])
  deepEqual(getPriorities(), { [id1]: 300, [id2]: 200, [id3]: 0 })

  await moveFilterDown(id1)
  deepEqual(getSorted(), [id3, id2, id1])
  deepEqual(getPriorities(), { [id1]: 300, [id2]: 200, [id3]: 0 })
})

test('validates filter query', () => {
  equal(isValidFilterQuery(''), false)
  equal(isValidFilterQuery('strange'), false)
  equal(isValidFilterQuery('include'), false)
  equal(isValidFilterQuery('include()'), false)
  equal(isValidFilterQuery('hasMedia(some)'), false)
  equal(isValidFilterQuery('hasMedia()'), false)

  equal(isValidFilterQuery('include(some text)'), true)
  equal(isValidFilterQuery('not include(some text)'), true)
  equal(isValidFilterQuery('hasMedia'), true)

  equal(isValidFilterQuery(' include( some text ) '), true)
  equal(isValidFilterQuery('not  include(some text)'), true)
})

test('applies filters to posts', () => {
  let filterImage: FilterValue = {
    action: 'fast',
    feedId: '10',
    id: '1',
    priority: 100,
    query: 'hasMedia'
  }
  let filterSpecial: FilterValue = {
    action: 'slow',
    feedId: '10',
    id: '2',
    priority: 200,
    query: 'include(Special Text)'
  }
  let filterOther: FilterValue = {
    action: 'delete',
    feedId: '10',
    id: '3',
    priority: 300,
    query: 'include(other text)'
  }
  let checker = prepareFilters([filterImage, filterSpecial, filterOther])

  equal(
    checker({
      full: 'Some text',
      media: ['https://example.com/image.jpg'],
      originId: '1'
    }),
    'fast'
  )

  equal(
    checker({
      full: 'Special text',
      media: ['https://example.com/image.jpg'],
      originId: '2'
    }),
    'fast'
  )

  equal(
    checker({
      full: 'Special text',
      media: [],
      originId: '3'
    }),
    'slow'
  )

  equal(
    checker({
      full: 'other text',
      media: [],
      originId: '4'
    }),
    'delete'
  )

  equal(
    checker({
      full: 'Some text',
      intro: 'other text',
      media: [],
      originId: '5'
    }),
    'delete'
  )

  equal(
    checker({
      full: 'Some text',
      intro: 'other text',
      media: [],
      originId: '6',
      title: 'some text'
    }),
    'delete'
  )

  equal(
    checker({
      full: 'special text',
      media: [],
      originId: '7',
      title: 'other text'
    }),
    'slow'
  )

  equal(
    checker({
      full: 'Some text',
      media: [],
      originId: '8'
    }),
    undefined
  )
})

test('supports not in filters', () => {
  let filterA: FilterValue = {
    action: 'fast',
    feedId: '10',
    id: '1',
    priority: 100,
    query: 'include(a)'
  }
  let filterNotB: FilterValue = {
    action: 'slow',
    feedId: '10',
    id: '2',
    priority: 200,
    query: 'not include(b)'
  }
  let checker = prepareFilters([filterA, filterNotB])

  equal(
    checker({
      full: 'a',
      media: [],
      originId: 'a'
    }),
    'fast'
  )

  equal(
    checker({
      full: 'a b',
      media: [],
      originId: 'a b'
    }),
    'fast'
  )

  equal(
    checker({
      full: 'c b',
      intro: 'other text',
      media: [],
      originId: 'c b'
    }),
    undefined
  )

  equal(
    checker({
      full: 'c',
      intro: 'other text',
      media: [],
      originId: 'c',
      title: 'some text'
    }),
    'slow'
  )
})

test('is ready for broken filters', () => {
  let filterA: FilterValue = {
    action: 'fast',
    feedId: '10',
    id: '1',
    priority: 100,
    query: 'broken'
  }
  let filterNotB: FilterValue = {
    action: 'slow',
    feedId: '10',
    id: '2',
    priority: 200,
    query: 'include(a)'
  }
  let checker = prepareFilters([filterA, filterNotB])

  equal(
    checker({
      full: 'a',
      media: [],
      originId: 'a'
    }),
    'slow'
  )

  equal(
    checker({
      full: 'b',
      media: [],
      originId: 'b'
    }),
    undefined
  )
})
