import type {
  CrdtTableChangedAction,
  CrdtTableCreatedAction,
  CrdtTableDeletedAction
} from '@logux/actions'
import {
  createStorageReducer,
  type CrossTabClient,
  type StorageReducer
} from '@logux/client'
import { persistentAtom } from '@nanostores/persistent'
import { atom, computed, effect, keepMount, onMount } from 'nanostores'

import { busyDuring } from './busy.ts'
import { client, onClient } from './client.ts'
import { getEnvironment } from './environment.ts'
import type { FilterValue } from './filter.ts'
import { waitLoading } from './lib/stores.ts'
import { commonMessages } from './messages/index.ts'
import { type Route, type RouteName, router } from './router.ts'
import {
  GENERAL_CATEGORY,
  getTableActions,
  openedDatabase,
  tableActions
} from './schema.ts'

export const FEED_ROUTES = [
  'add',
  'feedsByCategories',
  'import',
  'export'
] as const satisfies RouteName[]

export const SETTINGS_ROUTES = [
  'interface',
  'network',
  'cloud',
  'storage',
  'about'
] as const satisfies RouteName[]

// @ts-expect-error TODO: Remove until we have offline mode
delete SETTINGS_ROUTES.splice(1, 1)

export type OtherName =
  | (typeof FEED_ROUTES)[number]
  | (typeof SETTINGS_ROUTES)[number]

const FEEDS = new Set<RouteName>(FEED_ROUTES)

const SETTINGS = new Set<RouteName>(SETTINGS_ROUTES)

export function isOtherRoute(route: Route): boolean {
  return (
    route.route === 'menu' ||
    SETTINGS.has(route.route) ||
    FEEDS.has(route.route)
  )
}

export const menuSlider = computed(router, route => {
  if (route.route === 'slow') {
    return 'slow'
  } else if (route.route === 'fast') {
    return 'fast'
  } else if (isOtherRoute(route)) {
    return 'other'
  }
})

export interface MenuItem {
  id: string
  /**
   * Empty for the general category: its title is localized,
   * so it is taken from `commonMessages` in the render.
   */
  title: string
}

export type SlowMenu = [MenuItem, [MenuItem, number][]][]

type UnreadCount = { feedId: string; unread: number }

/**
 * Sorted `[id, title]` pairs of categories or of feeds of a single category.
 */
type Sorted = [string, string][]

/**
 * The menu structure reduced from the log to not rebuild and re-sort
 * everything on every change in the database.
 *
 * Posts are not here: their actions have only IDs, so counting unread posts
 * would need an index of all posts in `localStorage`. Unread counts come
 * from SQL.
 */
interface MenuState {
  categories: Sorted
  /**
   * Feeds with `reading: 'fast'`.
   */
  fast: Record<string, true>
  feedOf: Record<string, string>
  feeds: Record<string, Sorted>
  filters: Record<string, [feedId: string, action: FilterValue['action']]>
}

const EMPTY: MenuState = {
  categories: [],
  fast: {},
  feedOf: {},
  feeds: {},
  filters: {}
}

const REDUCER = 'slowreader:menu'

/**
 * Increase it on any change in the reducer’s logic or in `MenuState`
 * to rebuild the menu from the log.
 */
const VERSION = 1

function createdRows<Fields extends object>(
  action: CrdtTableCreatedAction<Fields>
): [string, Fields][] {
  if ('records' in action) {
    return action.records.map(record => [record.id, record])
  } else {
    return [[action.id, action.fields]]
  }
}

function changedIds(
  action: CrdtTableChangedAction | CrdtTableDeletedAction
): string[] {
  return 'ids' in action ? action.ids : [action.id]
}

/**
 * The server re-sends the actions, which the client did not confirm as
 * received, and their bodies are not in the log anymore to be ignored
 * as duplicates, so creation must be idempotent.
 */
function insert(list: Sorted, id: string, title: string): Sorted {
  let sorted = remove(list, id)
  let low = 0
  let high = sorted.length
  while (low < high) {
    let middle = (low + high) >> 1
    if (sorted[middle]![1].localeCompare(title) <= 0) {
      low = middle + 1
    } else {
      high = middle
    }
  }
  return sorted.toSpliced(low, 0, [id, title])
}

function remove(list: Sorted, id: string): Sorted {
  let index = list.findIndex(item => item[0] === id)
  return index === -1 ? list : list.toSpliced(index, 1)
}

function rename(list: Sorted, id: string, title: string): Sorted {
  let index = list.findIndex(item => item[0] === id)
  if (index === -1 || list[index]![1] === title) {
    return list
  } else {
    return insert(list.toSpliced(index, 1), id, title)
  }
}

let [createdCategory, changedCategory, deletedCategory] =
  tableActions.categories
let [createdFeed, changedFeed, deletedFeed] = tableActions.feeds
let [createdFilter, changedFilter, deletedFilter] = tableActions.filters

function createMenuReducer(logux: CrossTabClient): StorageReducer<MenuState> {
  let reducer = createStorageReducer<MenuState>(
    logux,
    REDUCER,
    VERSION,
    EMPTY,
    {
      decode(str) {
        return JSON.parse(str) as MenuState
      },
      encode(state) {
        return JSON.stringify(state)
      },
      // The menu has no posts: their actions have only IDs
      repeat: () => getTableActions(['categories', 'feeds', 'filters']),
      storage: getEnvironment().persistentStore
    }
  )

  reducer.type(createdCategory, (state, action) => {
    let categories = state.categories
    for (let [id, fields] of createdRows(action)) {
      categories = insert(categories, id, fields.title)
    }
    return { ...state, categories }
  })

  reducer.type(changedCategory, (state, action) => {
    let title = action.fields.title
    if (typeof title === 'undefined') return state
    let categories = state.categories
    for (let id of changedIds(action)) {
      categories = rename(categories, id, title)
    }
    return categories === state.categories ? state : { ...state, categories }
  })

  reducer.type(deletedCategory, (state, action) => {
    let categories = state.categories
    for (let id of changedIds(action)) {
      categories = remove(categories, id)
    }
    return categories === state.categories ? state : { ...state, categories }
  })

  reducer.type(createdFeed, (state, action) => {
    let fast = { ...state.fast }
    let feedOf = { ...state.feedOf }
    let feeds = { ...state.feeds }
    for (let [id, fields] of createdRows(action)) {
      let category = fields.categoryId!
      feeds[category] = insert(feeds[category] ?? [], id, fields.title)
      feedOf[id] = category
      if (fields.reading === 'fast') fast[id] = true
    }
    return { ...state, fast, feedOf, feeds }
  })

  reducer.type(changedFeed, (state, action) => {
    let { categoryId, reading, title } = action.fields
    if (
      typeof categoryId === 'undefined' &&
      typeof reading === 'undefined' &&
      typeof title === 'undefined'
    ) {
      return state
    }
    let changed = false
    let fast = { ...state.fast }
    let feedOf = { ...state.feedOf }
    let feeds = { ...state.feeds }
    for (let id of changedIds(action)) {
      let from = feedOf[id]
      if (typeof from === 'undefined') continue
      if (reading === 'fast' && !fast[id]) {
        fast[id] = true
        changed = true
      } else if (reading === 'slow' && fast[id]) {
        delete fast[id]
        changed = true
      }
      let list = feeds[from]!
      if (typeof categoryId !== 'undefined' && categoryId !== from) {
        let index = list.findIndex(item => item[0] === id)
        feeds[from] = list.toSpliced(index, 1)
        feedOf[id] = categoryId
        feeds[categoryId] = insert(
          feeds[categoryId] ?? [],
          id,
          title ?? list[index]![1]
        )
        changed = true
      } else if (typeof title !== 'undefined') {
        let renamed = rename(list, id, title)
        if (renamed !== list) {
          feeds[from] = renamed
          changed = true
        }
      }
    }
    return changed ? { ...state, fast, feedOf, feeds } : state
  })

  reducer.type(deletedFeed, (state, action) => {
    let changed = false
    let fast = { ...state.fast }
    let feedOf = { ...state.feedOf }
    let feeds = { ...state.feeds }
    for (let id of changedIds(action)) {
      let from = feedOf[id]
      if (typeof from === 'undefined') continue
      feeds[from] = remove(feeds[from]!, id)
      delete feedOf[id]
      delete fast[id]
      changed = true
    }
    return changed ? { ...state, fast, feedOf, feeds } : state
  })

  reducer.type(createdFilter, (state, action) => {
    let filters = { ...state.filters }
    for (let [id, fields] of createdRows(action)) {
      filters[id] = [fields.feedId, fields.action]
    }
    return { ...state, filters }
  })

  reducer.type(changedFilter, (state, action) => {
    let changes = action.fields
    if (
      typeof changes.action === 'undefined' &&
      typeof changes.feedId === 'undefined'
    ) {
      return state
    }
    let changed = false
    let filters = { ...state.filters }
    for (let id of changedIds(action)) {
      let filter = filters[id]
      if (!filter) continue
      filters[id] = [changes.feedId ?? filter[0], changes.action ?? filter[1]]
      changed = true
    }
    return changed ? { ...state, filters } : state
  })

  reducer.type(deletedFilter, (state, action) => {
    let changed = false
    let filters = { ...state.filters }
    for (let id of changedIds(action)) {
      if (!filters[id]) continue
      delete filters[id]
      changed = true
    }
    return changed ? { ...state, filters } : state
  })

  return reducer
}

interface MenuTree {
  fast: MenuItem[]
  slow: [MenuItem, MenuItem[]][]
}

/**
 * The general category has no title in the menu, so it can’t be sorted
 * with other categories and is always the first, like in `feedsByCategory()`.
 */
const GENERAL: [string, string] = [GENERAL_CATEGORY, '']

/**
 * Categories and feeds in the render order. It is recalculated only on
 * feeds/categories/filters changes, not on every read post.
 */
function buildTree(state: MenuState): MenuTree {
  let fastFeeds = new Set(Object.keys(state.fast))
  for (let id in state.filters) {
    let filter = state.filters[id]!
    if (filter[1] === 'fast') fastFeeds.add(filter[0])
  }

  let categories: Sorted = [GENERAL, ...state.categories]
  let fast: MenuItem[] = []
  let slow: [MenuItem, MenuItem[]][] = []
  for (let [id, title] of categories) {
    let list = state.feeds[id]
    if (!list || list.length === 0) continue
    let category = { id, title }
    slow.push([category, list.map(feed => ({ id: feed[0], title: feed[1] }))])
    if (list.some(feed => fastFeeds.has(feed[0]))) fast.push(category)
  }

  return {
    fast: fast.length > 0 ? fast : [{ id: GENERAL[0], title: GENERAL[1] }],
    slow
  }
}

function buildSlowMenu(tree: MenuTree, counts: Map<string, number>): SlowMenu {
  let menu: SlowMenu = []
  for (let [category, feeds] of tree.slow) {
    let list: [MenuItem, number][] = []
    for (let feed of feeds) {
      let count = counts.get(feed.id)
      if (count) list.push([feed, count])
    }
    if (list.length > 0) menu.push([category, list])
  }
  return menu
}

let $state = atom<MenuState>(EMPTY)
let $reduced = atom<boolean>(false)

onClient(logux => {
  let reducer = createMenuReducer(logux)
  let unbind = effect([reducer.value, reducer.status], (state, status) => {
    $state.set(state)
    $reduced.set(status === 'ready')
  })
  return () => {
    unbind()
    reducer.destroy()
    $state.set(EMPTY)
    $reduced.set(false)
  }
})

/**
 * Unread posts count by feed ID. `undefined` until the SQL query is loaded.
 *
 * The query is subscribed only while the menu is rendered and is re-created
 * on the database of the new user.
 */
let $unread = atom<Map<string, number> | undefined>()

onMount($unread, () =>
  effect(openedDatabase, db => {
    $unread.set(undefined)
    if (!db) return
    let store = db.store<UnreadCount>`
      SELECT "feedId", COUNT("originId") AS "unread" FROM "posts"
      WHERE "reading" = 'slow' AND "read" = 0
      GROUP BY "feedId"
    `
    return store.subscribe(rows => {
      if (rows.isLoading) {
        $unread.set(undefined)
      } else {
        $unread.set(new Map(rows.value.map(row => [row.feedId, row.unread])))
      }
    })
  })
)

let $tree = computed($state, buildTree)

export const fastMenu = computed($tree, tree => tree.fast)

export const slowMenu = computed([$tree, $unread], (tree, unread) => {
  return unread ? buildSlowMenu(tree, unread) : []
})

export const openableMenu = computed([fastMenu, slowMenu], (fast, slow) => ({
  fast: fast.length > 1,
  slow: slow.length > 0
}))

export const menuLoading = computed([$reduced, $unread], (reduced, unread) => {
  return !reduced || !unread
})

export const closedCategories = persistentAtom(
  'slowreader:closed',
  new Set<string>(),
  {
    decode: str => new Set(str.split(' ')),
    encode: set => Array.from(set).join(' ')
  }
)

export function openCategory(id: string): void {
  let clone = new Set(closedCategories.get())
  clone.delete(id)
  closedCategories.set(clone)
}

export function toggleCategory(id: string): void {
  let clone = new Set(closedCategories.get())
  if (clone.has(id)) {
    clone.delete(id)
  } else {
    clone.add(id)
  }
  closedCategories.set(clone)
}

export function busyUntilMenuLoader(): Promise<void> {
  if (client.get()) {
    keepMount(fastMenu)
    keepMount(slowMenu)
    return busyDuring(commonMessages.get().loadingData, () =>
      waitLoading(menuLoading)
    )
  } else {
    return Promise.resolve()
  }
}
