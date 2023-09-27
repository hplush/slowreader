import { ensureLoaded, type LoadedSyncMapValue, loadValue } from '@logux/client'
import { keepMount } from 'nanostores'
import { deepStrictEqual, equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'

import {
  addFeed,
  addFilter,
  addFilterForFeed,
  changeFilter,
  deleteFilter,
  type FilterValue,
  getFeed,
  getFiltersForFeed,
  isValidFilterQuery,
  moveFilterDown,
  moveFilterUp,
  prepareFilters,
  sortFilters
} from '../index.js'
import { cleanClientTest, enableClientTest } from './utils.js'

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  await cleanClientTest()
})

test('adds, loads, changes and removes filters', async () => {
  let filters10 = getFiltersForFeed('10')
  keepMount(filters10)
  deepStrictEqual((await loadValue(filters10)).list, [])

  let id1 = await addFilter({
    action: 'fast',
    feedId: '10',
    query: 'include(some text)'
  })
  deepStrictEqual(ensureLoaded(filters10.get()).list, [
    {
      action: 'fast',
      feedId: '10',
      id: id1,
      isLoading: false,
      priority: 100,
      query: 'include(some text)'
    }
  ])

  let id2 = await addFilter({
    action: 'slow',
    feedId: '10',
    query: 'hasMedia'
  })
  deepStrictEqual(ensureLoaded(filters10.get()).list, [
    {
      action: 'fast',
      feedId: '10',
      id: id1,
      isLoading: false,
      priority: 100,
      query: 'include(some text)'
    },
    {
      action: 'slow',
      feedId: '10',
      id: id2,
      isLoading: false,
      priority: 200,
      query: 'hasMedia'
    }
  ])

  await changeFilter(id1, { action: 'delete', priority: 150 })
  await deleteFilter(id2)
  let id3 = await addFilter({
    action: 'fast',
    feedId: '10',
    query: 'include(third)'
  })
  deepStrictEqual(ensureLoaded(filters10.get()).list, [
    {
      action: 'delete',
      feedId: '10',
      id: id1,
      isLoading: false,
      priority: 150,
      query: 'include(some text)'
    },
    {
      action: 'fast',
      feedId: '10',
      id: id3,
      isLoading: false,
      priority: 250,
      query: 'include(third)'
    }
  ])

  let before = ensureLoaded(filters10.get()).list
  await addFilter({
    action: 'slow',
    feedId: '20',
    query: 'hasMedia'
  })
  deepStrictEqual(ensureLoaded(filters10.get()).list, before)
})

test('adds filter for feed', async () => {
  let feedId1 = await addFeed({
    loader: 'rss',
    reading: 'fast',
    title: 'Feed 1',
    url: 'https://example.com/feed1'
  })
  let feedId2 = await addFeed({
    loader: 'rss',
    reading: 'slow',
    title: 'Feed 2',
    url: 'https://example.com/feed2'
  })

  let filterId1 = await addFilterForFeed(await loadValue(getFeed(feedId1)))
  let filterId2 = await addFilterForFeed(await loadValue(getFeed(feedId2)))

  deepStrictEqual((await loadValue(getFiltersForFeed(feedId1))).list, [
    {
      action: 'slow',
      feedId: feedId1,
      id: filterId1,
      isLoading: false,
      priority: 100,
      query: ''
    }
  ])
  deepStrictEqual((await loadValue(getFiltersForFeed(feedId2))).list, [
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
  let filter100: LoadedSyncMapValue<FilterValue> = {
    ...common,
    id: '100',
    priority: 100
  }
  let filter200a: LoadedSyncMapValue<FilterValue> = {
    ...common,
    id: '200',
    priority: 200
  }
  let filter200b: LoadedSyncMapValue<FilterValue> = {
    ...common,
    id: '400',
    priority: 200
  }
  let filter300: LoadedSyncMapValue<FilterValue> = {
    ...common,
    id: '300',
    priority: 300
  }
  deepStrictEqual(sortFilters([filter200a, filter300, filter100, filter200b]), [
    filter100,
    filter200a,
    filter200b,
    filter300
  ])
})

test('moves filters in sorting order', async () => {
  let filters10 = getFiltersForFeed('10')
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
  deepStrictEqual(getSorted(), [id1, id2, id3])
  deepStrictEqual(getPriorities(), { [id1]: 100, [id2]: 200, [id3]: 300 })

  await moveFilterUp(id3)
  deepStrictEqual(getSorted(), [id1, id3, id2])
  deepStrictEqual(getPriorities(), { [id1]: 100, [id2]: 200, [id3]: 150 })

  await moveFilterUp(id3)
  deepStrictEqual(getSorted(), [id3, id1, id2])
  deepStrictEqual(getPriorities(), { [id1]: 100, [id2]: 200, [id3]: 0 })

  await moveFilterUp(id3)
  deepStrictEqual(getSorted(), [id3, id1, id2])
  deepStrictEqual(getPriorities(), { [id1]: 100, [id2]: 200, [id3]: 0 })

  await moveFilterDown(id1)
  deepStrictEqual(getSorted(), [id3, id2, id1])
  deepStrictEqual(getPriorities(), { [id1]: 300, [id2]: 200, [id3]: 0 })

  await moveFilterDown(id1)
  deepStrictEqual(getSorted(), [id3, id2, id1])
  deepStrictEqual(getPriorities(), { [id1]: 300, [id2]: 200, [id3]: 0 })
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
  let filterImage: LoadedSyncMapValue<FilterValue> = {
    action: 'fast',
    feedId: '10',
    id: '1',
    isLoading: false,
    priority: 100,
    query: 'hasMedia'
  }
  let filterSpecial: LoadedSyncMapValue<FilterValue> = {
    action: 'slow',
    feedId: '10',
    id: '2',
    isLoading: false,
    priority: 200,
    query: 'include(Special Text)'
  }
  let filterOther: LoadedSyncMapValue<FilterValue> = {
    action: 'delete',
    feedId: '10',
    id: '3',
    isLoading: false,
    priority: 300,
    query: 'include(other text)'
  }
  let checker = prepareFilters([filterImage, filterSpecial, filterOther])

  equal(
    checker({
      full: 'Some text',
      id: '1',
      media: ['https://example.com/image.jpg']
    }),
    'fast'
  )

  equal(
    checker({
      full: 'Special text',
      id: '2',
      media: ['https://example.com/image.jpg']
    }),
    'fast'
  )

  equal(
    checker({
      full: 'Special text',
      id: '3',
      media: []
    }),
    'slow'
  )

  equal(
    checker({
      full: 'other text',
      id: '4',
      media: []
    }),
    'delete'
  )

  equal(
    checker({
      full: 'Some text',
      id: '5',
      intro: 'other text',
      media: []
    }),
    'delete'
  )

  equal(
    checker({
      full: 'Some text',
      id: '6',
      intro: 'other text',
      media: [],
      title: 'some text'
    }),
    'delete'
  )

  equal(
    checker({
      full: 'special text',
      id: '7',
      media: [],
      title: 'other text'
    }),
    'slow'
  )

  equal(
    checker({
      full: 'Some text',
      id: '8',
      media: []
    }),
    undefined
  )
})

test('supports not in filters', () => {
  let filterA: LoadedSyncMapValue<FilterValue> = {
    action: 'fast',
    feedId: '10',
    id: '1',
    isLoading: false,
    priority: 100,
    query: 'include(a)'
  }
  let filterNotB: LoadedSyncMapValue<FilterValue> = {
    action: 'slow',
    feedId: '10',
    id: '2',
    isLoading: false,
    priority: 200,
    query: 'not include(b)'
  }
  let checker = prepareFilters([filterA, filterNotB])

  equal(
    checker({
      full: 'a',
      id: 'a',
      media: []
    }),
    'fast'
  )

  equal(
    checker({
      full: 'a b',
      id: 'a b',
      media: []
    }),
    'fast'
  )

  equal(
    checker({
      full: 'c b',
      id: 'c b',
      intro: 'other text',
      media: []
    }),
    undefined
  )

  equal(
    checker({
      full: 'c',
      id: 'c',
      intro: 'other text',
      media: [],
      title: 'some text'
    }),
    'slow'
  )
})

test('is ready for broken filters', () => {
  let filterA: LoadedSyncMapValue<FilterValue> = {
    action: 'fast',
    feedId: '10',
    id: '1',
    isLoading: false,
    priority: 100,
    query: 'broken'
  }
  let filterNotB: LoadedSyncMapValue<FilterValue> = {
    action: 'slow',
    feedId: '10',
    id: '2',
    isLoading: false,
    priority: 200,
    query: 'include(a)'
  }
  let checker = prepareFilters([filterA, filterNotB])

  equal(
    checker({
      full: 'a',
      id: 'a',
      media: []
    }),
    'slow'
  )

  equal(
    checker({
      full: 'b',
      id: 'b',
      media: []
    }),
    undefined
  )
})
