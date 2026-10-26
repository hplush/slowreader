import {
  createStorageReducer,
  type CrossTabClient,
  type StorageReducer
} from '@logux/client'
import { parseCrdtRows } from '@logux/client/db'
import { persistentAtom } from '@nanostores/persistent'
import { atom, computed, effect, keepMount, onMount } from 'nanostores'

import { busyDuring } from './busy.ts'
import { client, onClient } from './client.ts'
import { getEnvironment } from './environment.ts'
import type { FilterValue } from './filter.ts'
import { waitLoading } from './lib/stores.ts'
import { hasPersonAvatar } from './loader/index.ts'
import { commonMessages } from './messages/index.ts'
import { type Route, type RouteName, router } from './router.ts'
import {
  accountsTable,
  categoriesTable,
  feedsTable,
  filtersTable,
  GENERAL_CATEGORY,
  getCrdt,
  getTableActions,
  openedDatabase
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
  'accounts',
  'cloud',
  'storage',
  'about'
] as const satisfies RouteName[]

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

export type MenuFeed = MenuItem & { avatar?: string; round?: true }

export type SlowMenu = [MenuItem, [MenuFeed, number][]][]

type UnreadCount = {
  accountId: null | string
  feedId: null | string
  reading: 'fast' | 'slow'
  unread: number
}

type UnreadCounts = { fast: Map<string, number>; slow: Map<string, number> }

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
  /**
   * Category of the account. Account’s posts are always fast.
   */
  accounts: Record<string, string>
  avatars: Record<string, string>
  categories: Sorted
  /**
   * Feeds with `reading: 'fast'`.
   */
  fast: Record<string, true>
  feedOf: Record<string, string>
  feeds: Record<string, Sorted>
  filters: Record<string, [feedId: string, action: FilterValue['action']]>
  round: Record<string, true>
}

const EMPTY: MenuState = {
  accounts: {},
  avatars: {},
  categories: [],
  fast: {},
  feedOf: {},
  feeds: {},
  filters: {},
  round: {}
}

const REDUCER = 'slowreader:menu'

/**
 * Increase it on any change in the reducer’s logic or in `MenuState`
 * to rebuild the menu from the log.
 */
const VERSION = 4

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
      repeat: () =>
        getTableActions(['accounts', 'categories', 'feeds', 'filters']),
      storage: getEnvironment().persistentStore
    }
  )

  reducer.type(accountsTable.created, (state, action) => {
    let accounts = { ...state.accounts }
    for (let [id, fields] of parseCrdtRows(action)) {
      accounts[id] = fields.categoryId ?? GENERAL_CATEGORY
    }
    return { ...state, accounts }
  })

  reducer.type(accountsTable.changed, (state, action) => {
    let { categoryId } = action.fields
    if (typeof categoryId === 'undefined') return state
    let accounts = { ...state.accounts }
    for (let [id] of parseCrdtRows(action)) {
      if (accounts[id]) accounts[id] = categoryId
    }
    return { ...state, accounts }
  })

  reducer.type(accountsTable.deleted, (state, action) => {
    let accounts = { ...state.accounts }
    for (let [id] of parseCrdtRows(action)) delete accounts[id]
    return { ...state, accounts }
  })

  reducer.type(categoriesTable.created, (state, action) => {
    let categories = state.categories
    for (let [id, fields] of parseCrdtRows(action)) {
      categories = insert(categories, id, fields.title)
    }
    return { ...state, categories }
  })

  reducer.type(categoriesTable.changed, (state, action) => {
    let title = action.fields.title
    if (typeof title === 'undefined') return state
    let categories = state.categories
    for (let [id] of parseCrdtRows(action)) {
      categories = rename(categories, id, title)
    }
    return categories === state.categories ? state : { ...state, categories }
  })

  reducer.type(categoriesTable.deleted, (state, action) => {
    let categories = state.categories
    for (let [id] of parseCrdtRows(action)) {
      categories = remove(categories, id)
    }
    return categories === state.categories ? state : { ...state, categories }
  })

  reducer.type(feedsTable.created, (state, action) => {
    let avatars = { ...state.avatars }
    let fast = { ...state.fast }
    let feedOf = { ...state.feedOf }
    let feeds = { ...state.feeds }
    let round = { ...state.round }
    for (let [id, fields] of parseCrdtRows(action)) {
      let category = fields.categoryId!
      feeds[category] = insert(feeds[category] ?? [], id, fields.title)
      feedOf[id] = category
      if (fields.reading === 'fast') fast[id] = true
      if (hasPersonAvatar(fields.loader)) round[id] = true
      if (fields.avatar) {
        avatars[id] = fields.avatar
      } else {
        delete avatars[id]
      }
    }
    return { ...state, avatars, fast, feedOf, feeds, round }
  })

  reducer.type(feedsTable.changed, (state, action) => {
    let { avatar, categoryId, reading, title } = action.fields
    if (
      typeof avatar === 'undefined' &&
      typeof categoryId === 'undefined' &&
      typeof reading === 'undefined' &&
      typeof title === 'undefined'
    ) {
      return state
    }
    let changed = false
    let avatars = { ...state.avatars }
    let fast = { ...state.fast }
    let feedOf = { ...state.feedOf }
    let feeds = { ...state.feeds }
    for (let [id] of parseCrdtRows(action)) {
      let from = feedOf[id]
      if (typeof from === 'undefined') continue
      if (avatar && avatars[id] !== avatar) {
        avatars[id] = avatar
        changed = true
      } else if (avatar === null && avatars[id]) {
        delete avatars[id]
        changed = true
      }
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
    return changed ? { ...state, avatars, fast, feedOf, feeds } : state
  })

  reducer.type(feedsTable.deleted, (state, action) => {
    let changed = false
    let avatars = { ...state.avatars }
    let fast = { ...state.fast }
    let feedOf = { ...state.feedOf }
    let feeds = { ...state.feeds }
    let round = { ...state.round }
    for (let [id] of parseCrdtRows(action)) {
      let from = feedOf[id]
      if (typeof from === 'undefined') continue
      feeds[from] = remove(feeds[from]!, id)
      delete avatars[id]
      delete feedOf[id]
      delete fast[id]
      delete round[id]
      changed = true
    }
    return changed ? { ...state, avatars, fast, feedOf, feeds, round } : state
  })

  reducer.type(filtersTable.created, (state, action) => {
    let filters = { ...state.filters }
    for (let [id, fields] of parseCrdtRows(action)) {
      filters[id] = [fields.feedId, fields.action]
    }
    return { ...state, filters }
  })

  reducer.type(filtersTable.changed, (state, action) => {
    let changes = action.fields
    if (
      typeof changes.action === 'undefined' &&
      typeof changes.feedId === 'undefined'
    ) {
      return state
    }
    let changed = false
    let filters = { ...state.filters }
    for (let [id] of parseCrdtRows(action)) {
      let filter = filters[id]
      if (!filter) continue
      filters[id] = [changes.feedId ?? filter[0], changes.action ?? filter[1]]
      changed = true
    }
    return changed ? { ...state, filters } : state
  })

  reducer.type(filtersTable.deleted, (state, action) => {
    let changed = false
    let filters = { ...state.filters }
    for (let [id] of parseCrdtRows(action)) {
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
  slow: [MenuItem, MenuFeed[]][]
  /**
   * IDs of feeds and accounts by category to count fast unread posts
   */
  sources: Map<string, string[]>
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

  let accountsByCategory = new Map<string, string[]>()
  for (let accountId in state.accounts) {
    let categoryId = state.accounts[accountId]!
    accountsByCategory.set(categoryId, [
      ...(accountsByCategory.get(categoryId) ?? []),
      accountId
    ])
  }

  let categories: Sorted = [GENERAL, ...state.categories]
  let fast: MenuItem[] = []
  let slow: [MenuItem, MenuFeed[]][] = []
  let sources = new Map<string, string[]>()
  for (let [id, title] of categories) {
    let list = state.feeds[id] ?? []
    let accounts = accountsByCategory.get(id) ?? []
    if (list.length === 0 && accounts.length === 0) continue
    let category = { id, title }
    sources.set(id, [...list.map(feed => feed[0]), ...accounts])
    if (accounts.length > 0 || list.some(feed => fastFeeds.has(feed[0]))) {
      fast.push(category)
    }
    if (list.length === 0) continue
    slow.push([
      category,
      list.map(([feedId, name]) => {
        let feed: MenuFeed = { id: feedId, title: name }
        let avatar = state.avatars[feedId]
        if (avatar) feed.avatar = avatar
        if (state.round[feedId]) feed.round = true
        return feed
      })
    ])
  }

  return {
    fast: fast.length > 0 ? fast : [{ id: GENERAL[0], title: GENERAL[1] }],
    slow,
    sources
  }
}

function buildSlowMenu(tree: MenuTree, counts: Map<string, number>): SlowMenu {
  let menu: SlowMenu = []
  for (let [category, feeds] of tree.slow) {
    let list: [MenuFeed, number][] = []
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
  let reducer: StorageReducer<MenuState>
  let unbind: () => void
  function start(): void {
    reducer = createMenuReducer(logux)
    unbind = effect([reducer.value, reducer.status], (state, status) => {
      $state.set(state)
      $reduced.set(status === 'ready')
    })
  }
  function stop(): void {
    unbind()
    reducer.destroy()
  }
  start()

  // Tests and stories empty the tables between cases, while the stored menu
  // has the same version and will not be rebuilt by itself
  let unbindEmpty = getCrdt().on('empty', () => {
    stop()
    let storage = getEnvironment().persistentStore
    delete storage[REDUCER]
    delete storage[`logux:reducer:${REDUCER}`]
    start()
  })

  return () => {
    unbindEmpty()
    stop()
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
let $unread = atom<undefined | UnreadCounts>()

onMount($unread, () =>
  effect(openedDatabase, db => {
    $unread.set(undefined)
    if (!db) return
    let store = db.store<UnreadCount>`
      SELECT "feedId", "accountId", "reading", COUNT("originId") AS "unread"
      FROM "posts"
      WHERE "read" = 0 AND "merged" = 0 AND "reading" IN ('fast', 'slow')
      GROUP BY "feedId", "accountId", "reading"
    `
    return store.subscribe(rows => {
      if (rows.status === 'loading') {
        $unread.set(undefined)
      } else {
        let counts: UnreadCounts = { fast: new Map(), slow: new Map() }
        for (let row of rows.value) {
          counts[row.reading].set(row.feedId ?? row.accountId!, row.unread)
        }
        $unread.set(counts)
      }
    })
  })
)

let $tree = computed($state, buildTree)

export const fastMenu = computed($tree, tree => tree.fast)

export const slowMenu = computed([$tree, $unread], (tree, unread) => {
  return unread ? buildSlowMenu(tree, unread.slow) : []
})

export function firstUnreadSlowFeedId(): string | undefined {
  let [firstCategory] = slowMenu.get()
  if (!firstCategory) return undefined
  let [, feeds] = firstCategory
  let [firstFeed] = feeds
  return firstFeed?.[0].id
}

/**
 * Fast categories with unread posts. The fast menu itself keeps all
 * categories, since the navbar is a list of tabs, not a list of tasks.
 */
export const unreadFastMenu = computed([$tree, $unread], (tree, unread) => {
  if (!unread) return []
  return tree.fast.filter(category => {
    return tree.sources.get(category.id)?.some(id => unread.fast.get(id))
  })
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
