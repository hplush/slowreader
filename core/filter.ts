import {
  changeSyncMapById,
  createFilter,
  createSyncMap,
  deleteSyncMapById,
  type FilterStore,
  type LoadedSyncMapValue,
  loadValue,
  syncMapTemplate
} from '@logux/client'
import { nanoid } from 'nanoid'

import { getClient } from './client.js'
import type { FeedValue } from './feed.js'
import type { OriginPost } from './post.js'

const QUERY_REGEXP = /^(not\s+)?([\w]+)(?:\(([^]+)\))?$/

const QUERIES_WITH_PARAM = { include: true } as const

const QUERIES = {
  hasMedia(post) {
    return post.media.length > 0
  },
  include(post, pattern) {
    let lower = pattern.toLowerCase()
    return (
      (post.full?.toLowerCase().includes(lower) ||
        post.intro?.toLowerCase().includes(lower) ||
        post.title?.toLowerCase().includes(lower)) ??
      false
    )
  }
} satisfies {
  [Key in string]?: keyof typeof QUERIES_WITH_PARAM extends Key
    ? (post: OriginPost, param: string) => boolean
    : (post: OriginPost) => boolean
}

export type FilterAction = 'delete' | 'fast' | 'slow'

function maxPriority(filters: FilterValue[]): number {
  let max = 0
  for (let filter of filters) {
    if (max < filter.priority) max = filter.priority
  }
  return max
}

export type FilterValue = {
  action: FilterAction
  feedId: string
  priority: number
  query: string
}

export const Filter = syncMapTemplate<FilterValue>('filters', {
  offline: true,
  remote: false
})

export function getFiltersForFeed(feedId: string): FilterStore<FilterValue> {
  return createFilter(getClient(), Filter, { feedId })
}

export async function addFilter(
  fields: Omit<FilterValue, 'priority'>
): Promise<string> {
  let id = nanoid()
  let other = await loadValue(getFiltersForFeed(fields.feedId))
  let priority = maxPriority(other.list) + 100
  await createSyncMap(getClient(), Filter, { id, priority, ...fields })
  return id
}

export async function addFilterForFeed(
  feed: LoadedSyncMapValue<FeedValue>
): Promise<string> {
  return addFilter({
    action: feed.reading === 'fast' ? 'slow' : 'fast',
    feedId: feed.id,
    query: ''
  })
}

export async function deleteFilter(filterId: string): Promise<void> {
  return deleteSyncMapById(getClient(), Filter, filterId)
}

export async function changeFilter(
  filterId: string,
  changes: Partial<FilterValue>
): Promise<void> {
  return changeSyncMapById(getClient(), Filter, filterId, changes)
}

export function sortFilters(
  filters: LoadedSyncMapValue<FilterValue>[]
): LoadedSyncMapValue<FilterValue>[] {
  return filters.sort((a, b) => {
    if (a.priority > b.priority) {
      return 1
    } else if (a.priority < b.priority) {
      return -1
    } else {
      return a.id.localeCompare(b.id)
    }
  })
}

async function move(filterId: string, diff: -1 | 1): Promise<void> {
  let filter = Filter(filterId, getClient())
  let feedId = (await loadValue(filter)).feedId
  let sorted = sortFilters((await loadValue(getFiltersForFeed(feedId))).list)
  let last = sorted.length - 1
  let index = sorted.findIndex(i => i.id === filterId)
  let next = index + diff
  if (next >= 0 && next < sorted.length) {
    let nextPriority
    if (next === 0) {
      nextPriority = sorted[0].priority - 100
    } else if (next === last) {
      nextPriority = sorted[last].priority + 100
    } else {
      nextPriority = (sorted[next - 1].priority + sorted[next].priority) / 2
    }
    await changeFilter(filterId, { priority: nextPriority })
  }
}

export async function moveFilterUp(filterId: string): Promise<void> {
  await move(filterId, -1)
}

export async function moveFilterDown(filterId: string): Promise<void> {
  await move(filterId, +1)
}

function isValidQueryName(name: string): name is keyof typeof QUERIES {
  return name in QUERIES
}

function isValidQuery(parsed: ReturnType<typeof parseQuery>): parsed is {
  name: keyof typeof QUERIES
  not: boolean
  param: string
} {
  return !('invalid' in parsed)
}

function parseQuery(
  query: string
):
  | { invalid: true }
  | { name: keyof typeof QUERIES; not: boolean; param: string } {
  let match = query.trim().match(QUERY_REGEXP)
  if (!match) {
    return { invalid: true }
  } else {
    let [, not, name, param] = match
    if (isValidQueryName(name)) {
      let hasParams = name in QUERIES_WITH_PARAM
      if (hasParams && !param) {
        return { invalid: true }
      } else if (!hasParams && param) {
        return { invalid: true }
      }
      return { name, not: !!not, param }
    } else {
      return { invalid: true }
    }
  }
}

export function isValidFilterQuery(query: string): boolean {
  return isValidQuery(parseQuery(query))
}

interface Checker {
  (post: OriginPost): FilterAction | undefined
}

export function prepareFilters(
  filters: LoadedSyncMapValue<FilterValue>[]
): Checker {
  let checkers = sortFilters(filters)
    .map<Checker | undefined>(filter => {
      let parsed = parseQuery(filter.query)
      if (isValidQuery(parsed)) {
        let { name, not, param } = parsed
        if (not) {
          return post => {
            return QUERIES[name](post, param) ? undefined : filter.action
          }
        } else {
          return post => {
            return QUERIES[name](post, param) ? filter.action : undefined
          }
        }
      } else {
        return undefined
      }
    })
    .filter((i): i is Checker => i !== undefined)
  return post => {
    for (let checker of checkers) {
      let action = checker(post)
      if (action) return action
    }
    return undefined
  }
}

export async function loadAndPrepareFilters(feedId: string): Promise<Checker> {
  let filters = await loadValue(getFiltersForFeed(feedId))
  return prepareFilters(filters.list)
}
