import { persistentAtom } from '@nanostores/persistent'
import { atom, computed, effect, keepMount } from 'nanostores'

import { busyDuring } from './busy.ts'
import { type CategoryValue, getGeneralCategory } from './category.ts'
import { client } from './client.ts'
import { layoutType } from './environment.ts'
import type { FeedValue } from './feed.ts'
import { onMountAny, waitLoading } from './lib/stores.ts'
import { isOtherRoute, router } from './router.ts'
import { getDatabase } from './schema.ts'

export type MenuType = 'fast' | 'other' | 'slow'

let $menuOverride = atom<MenuType | undefined>()

export const openedMenu = computed(
  [layoutType, $menuOverride, router],
  (layout, override, route) => {
    if (layout !== 'desktop') {
      return override
    } else if (route.route === 'fast') {
      return 'fast'
    } else if (route.route === 'slow') {
      return 'slow'
    } else if (isOtherRoute(route)) {
      return 'other'
    }
  }
)

export const menuSlider = computed(
  [$menuOverride, router],
  (override, route) => {
    if (override) {
      return override
    } else if (route.route === 'slow') {
      return 'slow'
    } else if (route.route === 'fast') {
      return 'fast'
    } else if (isOtherRoute(route)) {
      return 'other'
    }
  }
)

export function openMenu(type: MenuType): boolean {
  if (layoutType.get() === 'desktop') {
    return true
  } else if (type === 'other') {
    $menuOverride.set('other')
    return false
  } else {
    let open: boolean
    if (type === 'fast') {
      open = fastMenu.get().length > 1
    } else {
      open = slowMenu.get().length > 0
    }
    if (open) $menuOverride.set(type)
    return !open
  }
}

export function closeMenu(): void {
  $menuOverride.set(undefined)
}

export type SlowMenu = [CategoryValue, [FeedValue, number][]][]

export let fastMenu = atom<CategoryValue[]>([])
export let slowMenu = atom<SlowMenu>([])
export let menuLoading = atom<boolean>(true)

type UnreadCount = { feedId: string; unread: number }

/**
 * Performance optimization is postponed after the prototype.
 *
 * So we rebuild the fast/slow feeds menu on every feed/category/filter changes.
 */
function rebuild(
  categories: CategoryValue[],
  fastCategories: Pick<FeedValue, 'categoryId'>[],
  slowFeeds: FeedValue[],
  unread: UnreadCount[]
): void {
  let byId = new Map(categories.map(category => [category.id, category]))

  let fast: CategoryValue[] = []
  for (let { categoryId } of fastCategories) {
    if (categoryId === 'general') {
      fast.push(getGeneralCategory())
    } else {
      let found = byId.get(categoryId)
      if (found) fast.push(found)
    }
  }
  fast.sort((a, b) => a.title.localeCompare(b.title))
  fastMenu.set(fast.length > 0 ? fast : [getGeneralCategory()])

  let unreadByFeed = new Map(unread.map(i => [i.feedId, i.unread]))
  let byCategory = new Map<string, [FeedValue, number][]>()
  let general = false
  for (let feed of slowFeeds) {
    if (feed.categoryId === 'general') {
      general = true
    } else if (!byId.has(feed.categoryId)) {
      continue
    }
    let list = byCategory.get(feed.categoryId)
    if (!list) {
      list = []
      byCategory.set(feed.categoryId, list)
    }
    list.push([feed, unreadByFeed.get(feed.id)!])
  }

  let allCategories = [...categories]
  if (general) allCategories.push(getGeneralCategory())

  let result: SlowMenu = []
  for (let category of allCategories.toSorted((a, b) => {
    return a.title.localeCompare(b.title)
  })) {
    let list = byCategory.get(category.id)
    if (list) {
      list.sort((a, b) => a[0].title.localeCompare(b[0].title))
      result.push([category, list])
    }
  }

  slowMenu.set(result)
}

onMountAny([fastMenu, slowMenu], () => {
  menuLoading.set(true)

  let database = getDatabase()
  let unbind = effect(
    [
      database.store<CategoryValue>`SELECT * FROM "categories"`,
      database.store<Pick<FeedValue, 'categoryId'>>`
        SELECT DISTINCT "categoryId" FROM "feeds"
        WHERE "reading" = 'fast'
          OR "id" IN (SELECT "feedId" FROM "filters" WHERE "action" = 'fast')
      `,
      database.store<FeedValue>`
        SELECT * FROM "feeds" WHERE "id" IN (
          SELECT "feedId" FROM "posts"
          WHERE "reading" = 'slow' AND "read" = 0
        )
      `,
      database.store<UnreadCount>`
        SELECT "feedId", COUNT("originId") AS "unread" FROM "posts"
        WHERE "reading" = 'slow' AND "read" = 0
        GROUP BY "feedId"
      `
    ],
    (categories, fastCategories, slowFeeds, unread) => {
      if (
        categories.isLoading ||
        fastCategories.isLoading ||
        slowFeeds.isLoading ||
        unread.isLoading
      ) {
        return
      }
      // TODO Logux DB: replace with reducer
      rebuild(
        categories.value,
        fastCategories.value,
        slowFeeds.value,
        unread.value
      )
      menuLoading.set(false)
    }
  )

  return () => {
    unbind()
    fastMenu.set([])
    slowMenu.set([])
    menuLoading.set(true)
  }
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
    return busyDuring(() => waitLoading(menuLoading))
  } else {
    return Promise.resolve()
  }
}
