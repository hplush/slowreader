import type { LoadedSyncMapValue } from '@logux/client'
import { ensureLoaded, loadValue } from '@logux/client'
import { cleanStores, keepMount } from 'nanostores'
import { test } from 'uvu'
import { equal } from 'uvu/assert'

import {
  addFilter,
  changeFilter,
  deleteFilter,
  enableClientTest,
  Filter,
  filtersForFeed,
  type FilterValue,
  isValidFilterQuery,
  moveFilterDown,
  moveFilterUp,
  prepareFilters,
  sortFilters,
  userId
} from './index.js'

test.before.each(() => {
  enableClientTest()
  userId.set('10')
})

test.after.each(async () => {
  cleanStores(Filter, userId)
})

test('adds, loads, changes and removes filters', async () => {
  let filters10 = filtersForFeed('10')
  keepMount(filters10)
  equal((await loadValue(filters10)).list, [])

  let id1 = await addFilter({
    action: 'fast',
    feedId: '10',
    query: 'include(some text)'
  })
  equal(ensureLoaded(filters10.get()).list, [
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
  equal(ensureLoaded(filters10.get()).list, [
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
  equal(ensureLoaded(filters10.get()).list, [
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
  equal(ensureLoaded(filters10.get()).list, before)
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
  equal(sortFilters([filter200a, filter300, filter100, filter200b]), [
    filter100,
    filter200a,
    filter200b,
    filter300
  ])
})

test('moves filters in sorting order', async () => {
  let filters10 = filtersForFeed('10')
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
  equal(getSorted(), [id1, id2, id3])
  equal(getPriorities(), { [id1]: 100, [id2]: 200, [id3]: 300 })

  await moveFilterUp(id3)
  equal(getSorted(), [id1, id3, id2])
  equal(getPriorities(), { [id1]: 100, [id2]: 200, [id3]: 150 })

  await moveFilterUp(id3)
  equal(getSorted(), [id3, id1, id2])
  equal(getPriorities(), { [id1]: 100, [id2]: 200, [id3]: 0 })

  await moveFilterUp(id3)
  equal(getSorted(), [id3, id1, id2])
  equal(getPriorities(), { [id1]: 100, [id2]: 200, [id3]: 0 })

  await moveFilterDown(id1)
  equal(getSorted(), [id3, id2, id1])
  equal(getPriorities(), { [id1]: 300, [id2]: 200, [id3]: 0 })

  await moveFilterDown(id1)
  equal(getSorted(), [id3, id2, id1])
  equal(getPriorities(), { [id1]: 300, [id2]: 200, [id3]: 0 })
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
      media: ['https://example.com/image.jpg']
    }),
    'fast'
  )

  equal(
    checker({
      full: 'Special text',
      media: ['https://example.com/image.jpg']
    }),
    'fast'
  )

  equal(
    checker({
      full: 'Special text',
      media: []
    }),
    'slow'
  )

  equal(
    checker({
      full: 'other text',
      media: []
    }),
    'delete'
  )

  equal(
    checker({
      full: 'Some text',
      intro: 'other text',
      media: []
    }),
    'delete'
  )

  equal(
    checker({
      full: 'Some text',
      intro: 'other text',
      media: [],
      title: 'some text'
    }),
    'delete'
  )

  equal(
    checker({
      full: 'special text',
      media: [],
      title: 'other text'
    }),
    'slow'
  )

  equal(
    checker({
      full: 'Some text',
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
      media: []
    }),
    'fast'
  )

  equal(
    checker({
      full: 'a b',
      media: []
    }),
    'fast'
  )

  equal(
    checker({
      full: 'c b',
      intro: 'other text',
      media: []
    }),
    undefined
  )

  equal(
    checker({
      full: 'c',
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
      media: []
    }),
    'slow'
  )

  equal(
    checker({
      full: 'b',
      media: []
    }),
    undefined
  )
})

test.run()
