import { atom, type ReadableAtom } from 'nanostores'

import { onEnvironment } from './environment.js'
import { fastCategories } from './fast.js'
import { hasFeeds } from './feed.js'
import { userId } from './settings.js'
import { computeFrom, readonlyExport } from './utils/stores.js'

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

export type Route<Name extends RouteName = RouteName> = Name extends string
  ? { params: Routes[Name]; redirect?: boolean; route: Name }
  : never

type StringParams<Object> = {
  [K in keyof Object]: Object[K] extends string ? Object[K] : Object[K] | string
}

export type BaseRoute<Name extends RouteName = RouteName> = Name extends string
  ? { params: StringParams<Routes[Name]>; route: Name }
  : never

export type BaseRouter = ReadableAtom<BaseRoute | undefined>

const GUEST = new Set<Route['route']>(['start', 'signin'])

const SETTINGS = new Set<Route['route']>([
  'interface',
  'profile',
  'about',
  'download'
])

const ORGANIZE = new Set<Route['route']>(['add', 'categories'])

function redirect<Name extends keyof Routes>(
  route: Name,
  params: Routes[Name]
): Route {
  // @ts-expect-error Too complex types
  return { params, redirect: true, route }
}

function open<Name extends keyof Routes>(
  route: Name,
  params: Routes[Name]
): Route {
  // @ts-expect-error Too complex types
  return { params, route }
}

function isNumber(value: number | string): boolean {
  return typeof value === 'number' || /^\d+$/.test(value)
}

let $router = atom<Route>({ params: {}, route: 'home' })

export const router = readonlyExport($router)

onEnvironment(({ baseRouter }) => {
  return computeFrom(
    $router,
    [baseRouter, userId, hasFeeds, fastCategories],
    (page, user, withFeeds, fast) => {
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
          if (page.params.category && !fast.isLoading) {
            let category = fast.categories.find(
              i => i.id === page.params.category
            )
            if (!category) {
              return open('notFound', {})
            }
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
  )
})

export function isFastRoute(route: Route): boolean {
  return route.route === 'fast'
}

export function isSlowRoute(route: Route): boolean {
  return route.route === 'slowAll'
}

export function isGuestRoute(route: Route): boolean {
  return GUEST.has(route.route)
}

export function isSettingsRoute(route: Route): boolean {
  return SETTINGS.has(route.route)
}

export function isOrganizeRoute(route: Route): boolean {
  return ORGANIZE.has(route.route)
}
