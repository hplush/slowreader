import { computed, type ReadableAtom } from 'nanostores'

import { onEnvironment } from './environment.js'
import { fastCategories, type FastCategoriesValue } from './fast.js'
import { hasFeeds } from './feed.js'
import { userId } from './settings.js'

export interface Routes {
  about: {}
  add: { url?: string }
  categories: { feed?: string }
  download: {}
  fast: { category?: string; since?: number }
  feeds: {}
  home: {}
  interface: {}
  notFound: {}
  profile: {}
  refresh: {}
  settings: {}
  signin: {}
  slowAll: {}
  start: {}
  subscriptions: {}
  welcome: {}
}

export type RouteName = keyof Routes

type StringParams<Object> = {
  [K in keyof Object]: Object[K] extends string ? Object[K] : Object[K] | string
}

export type BaseRoute<Name extends RouteName = RouteName> = Name extends string
  ? { params: StringParams<Routes[Name]>; route: Name }
  : never

export type BaseRouter = ReadableAtom<BaseRoute | undefined>

export type AppRoute = BaseRoute & {
  redirect: boolean
}

const GUEST = new Set<AppRoute['route']>(['start', 'signin'])

const SETTINGS = new Set<AppRoute['route']>([
  'interface',
  'profile',
  'about',
  'download'
])

const ORGANIZE = new Set<AppRoute['route']>(['add', 'categories'])

function redirect<Name extends keyof Routes>(
  route: Name,
  params: Routes[Name]
): AppRoute {
  // @ts-expect-error Too complex types
  return { params, redirect: true, route }
}

function open<Name extends keyof Routes>(
  route: Name,
  params: Routes[Name]
): AppRoute {
  // @ts-expect-error Too complex types
  return { params, redirect: false, route }
}

function isNumber(value: number | string): boolean {
  return typeof value === 'number' || /^\d+$/.test(value)
}

function getRoute(
  page: BaseRoute | undefined,
  user: string | undefined,
  withFeeds: boolean | undefined,
  fast: FastCategoriesValue
): AppRoute {
  if (!page) {
    return open('notFound', {})
  } else if (user) {
    if (GUEST.has(page.route) || page.route === 'home') {
      if (withFeeds) {
        return redirect('slowAll', {})
      } else {
        return redirect('welcome', {})
      }
    } else if (page.route === 'welcome' && withFeeds) {
      return redirect('slowAll', {})
    } else if (page.route === 'settings') {
      return redirect('interface', {})
    } else if (page.route === 'feeds') {
      return redirect('categories', {})
    } else if (page.route === 'fast') {
      if (!page.params.category && !fast.isLoading) {
        return redirect('fast', { category: fast.categories[0].id })
      }
      if (page.params.since) {
        let since = page.params.since
        if (isNumber(since)) {
          return open('fast', {
            category: page.params.category,
            since: typeof since === 'number' ? since : parseInt(since)
          })
        } else {
          return open('notFound', {})
        }
      }
    }
  } else if (!GUEST.has(page.route)) {
    return open('start', {})
  }
  return open(page.route, page.params)
}

export let router: ReadableAtom<AppRoute>

onEnvironment(({ baseRouter }) => {
  router = computed(
    [baseRouter, userId, hasFeeds, fastCategories],
    (page, user, withFeeds, fast) => {
      return getRoute(page, user, withFeeds, fast)
    }
  )
})

export function isFastRoute(route: AppRoute): boolean {
  return route.route === 'fast'
}

export function isSlowRoute(route: AppRoute): boolean {
  return route.route === 'slowAll'
}

export function isGuestRoute(route: AppRoute): boolean {
  return GUEST.has(route.route)
}

export function isSettingsRoute(route: AppRoute): boolean {
  return SETTINGS.has(route.route)
}

export function isOrganizeRoute(route: AppRoute): boolean {
  return ORGANIZE.has(route.route)
}
