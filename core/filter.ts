import { type PostContent, recalcPostsReading } from './post.ts'
import {
  createRow,
  type FeedValue,
  type FilterChanges,
  type FilterValue,
  getTables,
  type NewFilter,
  select
} from './schema.ts'

export type { FilterValue, NewFilter }

const QUERY_REGEXP = /^(not\s+)?([\w]+)(?:\(([^]+)\))?$/

const QUERIES_WITH_PARAM = { include: true } as const

const QUERIES = {
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
    ? (post: PostContent, param: string) => boolean
    : (post: PostContent) => boolean
}

export type FilterAction = FilterValue['action']

function maxPriority(filters: FilterValue[]): number {
  let max = 0
  for (let filter of filters) {
    if (max < filter.priority) max = filter.priority
  }
  return max
}

export function loadFilters(): Promise<FilterValue[]> {
  return select<FilterValue>`SELECT * FROM "filters" ORDER BY "priority", "id"`
}

export function loadFiltersByFeed(feedId: string): Promise<FilterValue[]> {
  return select<FilterValue>`
    SELECT * FROM "filters" WHERE "feedId" = ${feedId}
    ORDER BY "priority", "id"
  `
}

export function loadFilter(filterId: string): Promise<FilterValue | undefined> {
  return select<FilterValue>`
    SELECT * FROM "filters" WHERE "id" = ${filterId}
  `.then(rows => rows[0])
}

export async function addFilter(
  fields: { priority?: number } & Omit<NewFilter, 'priority'>
): Promise<string> {
  let priority = maxPriority(await loadFiltersByFeed(fields.feedId)) + 100
  let id = await createRow(getTables().filters, { priority, ...fields })
  await recalcPostsReading(fields.feedId)
  return id
}

export async function addFilterForFeed(feed: FeedValue): Promise<string> {
  return addFilter({
    action: feed.reading === 'fast' ? 'slow' : 'fast',
    feedId: feed.id,
    query: ''
  })
}

export async function deleteFilter(filterId: string): Promise<void> {
  let filter = await loadFilter(filterId)

  await getTables().filters.delete(filterId)

  if (filter) {
    await recalcPostsReading(filter.feedId)
  }
}

export async function changeFilter(
  filterId: string,
  changes: FilterChanges
): Promise<void> {
  await getTables().filters.update(filterId, changes)
  let filter = await loadFilter(filterId)
  if (filter) {
    await recalcPostsReading(filter.feedId)
  }
}

export function sortFilters(filters: FilterValue[]): FilterValue[] {
  return filters.toSorted((a, b) => {
    if (a.priority > b.priority) {
      return 1
    } else if (a.priority < b.priority) {
      return -1
    } else {
      return a.id.localeCompare(b.id)
    }
  })
}

/**
 * Moves a filter up or down in priority by recalculating its priority value
 * relative to neighboring filters to maintain sort order.
 */
async function move(filterId: string, diff: -1 | 1): Promise<void> {
  let filter = await loadFilter(filterId)
  if (!filter) return
  let sorted = sortFilters(await loadFiltersByFeed(filter.feedId))
  let last = sorted.length - 1
  let index = sorted.findIndex(i => i.id === filterId)
  let next = index + diff
  if (next >= 0 && next < sorted.length) {
    let nextPriority
    if (next === 0) {
      nextPriority = sorted[0]!.priority - 100
    } else if (next === last) {
      nextPriority = sorted[last]!.priority + 100
    } else {
      nextPriority = (sorted[next - 1]!.priority + sorted[next]!.priority) / 2
    }
    await changeFilter(filterId, { priority: nextPriority })
  }
}

export async function moveFilterUp(filterId: string): Promise<void> {
  await move(filterId, -1)
}

export async function moveFilterDown(filterId: string): Promise<void> {
  await move(filterId, 1)
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
    if (isValidQueryName(name!)) {
      let hasParams = name in QUERIES_WITH_PARAM
      /* node:coverage ignore next 5 */
      if (hasParams && !param) {
        return { invalid: true }
      } else if (!hasParams && param) {
        return { invalid: true }
      }
      return { name, not: !!not, param: param! }
    } else {
      return { invalid: true }
    }
  }
}

export function isValidFilterQuery(query: string): boolean {
  return isValidQuery(parseQuery(query))
}

export interface FilterChecker {
  (post: PostContent): FilterAction | undefined
}

export function prepareFilters(filters: FilterValue[]): FilterChecker {
  let checkers = sortFilters(filters)
    .map<FilterChecker | undefined>(filter => {
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
    .filter((i): i is FilterChecker => i !== undefined)
  return post => {
    for (let checker of checkers) {
      let action = checker(post)
      if (action) return action
    }
    return undefined
  }
}

export async function loadFilterChecker(
  feedId: string
): Promise<FilterChecker> {
  return prepareFilters(await loadFiltersByFeed(feedId))
}
