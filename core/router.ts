import { atom, type ReadableAtom } from 'nanostores'

import { getEnvironment, onEnvironment } from './environment.js'
import { fastCategories } from './fast.js'
import { hasFeeds } from './feed.js'
import { userId } from './settings.js'
import { computeFrom, readonlyExport } from './utils/stores.js'

export interface Routes {
  about: {}
  add: { url?: string }
  categories: { feed?: string }
  download: {}
  fast: { category?: string; post?: string; since?: number }
  feeds: {}
  home: {}
  interface: {}
  notFound: {}
  profile: {}
  refresh: {}
  settings: {}
  signin: {}
  slow: { feed?: string; post?: string }
  start: {}
  subscriptions: {}
  welcome: {}
}

export type RouteName = keyof Routes

type EmptyObject = Record<string, never>

type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K
}[keyof T]

// Constructing a type without optional keys
type WithoutOptional<T> = Pick<T, RequiredKeys<T>>

export type ParamlessRouteName = {
  [K in RouteName]: WithoutOptional<Routes[K]> extends EmptyObject ? K : never
}[RouteName]

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

const GUEST = new Set<RouteName>(['start', 'signin'])

const SETTINGS = new Set<RouteName>([
  'interface',
  'profile',
  'about',
  'download'
])

const ORGANIZE = new Set<RouteName>(['add', 'categories'])

function open(route: ParamlessRouteName | Route): Route {
  if (typeof route === 'string') route = { params: {}, route } as Route
  return route
}

function redirect(route: ParamlessRouteName | Route): Route {
  return { ...open(route), redirect: true }
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
        return open('notFound')
      } else if (user) {
        if (GUEST.has(page.route) || page.route === 'home') {
          if (withFeeds) {
            return redirect({ params: {}, route: 'slow' })
          } else {
            return redirect('welcome')
          }
        } else if (page.route === 'welcome' && withFeeds) {
          return redirect('slow')
        } else if (page.route === 'settings') {
          return redirect('interface')
        } else if (page.route === 'feeds') {
          return redirect('categories')
        } else if (page.route === 'fast') {
          if (!page.params.category && !fast.isLoading) {
            return redirect({
              params: { category: fast.categories[0].id },
              route: 'fast'
            })
          }
          if (page.params.category && !fast.isLoading) {
            let category = fast.categories.find(
              i => i.id === page.params.category
            )
            if (!category) {
              return open('notFound')
            }
          }
          if (page.params.since) {
            if (isNumber(page.params.since)) {
              let since =
                typeof page.params.since === 'number'
                  ? page.params.since
                  : parseInt(page.params.since)
              return open({
                params: {
                  ...page.params,
                  since
                },
                route: 'fast'
              })
            } else {
              return open('notFound')
            }
          }
        }
      } else if (!GUEST.has(page.route)) {
        return open('start')
      }
      return page
    },
    (oldRoute, newRoute) => {
      return (
        oldRoute.route === newRoute.route &&
        JSON.stringify(oldRoute.params) === JSON.stringify(newRoute.params)
      )
    }
  )
})

export function isFastRoute(route: Route): boolean {
  return route.route === 'fast'
}

export function isSlowRoute(route: Route): boolean {
  return route.route === 'slow'
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

export function removeFeedFromRoute(): void {
  let page = router.get()
  if (page.route === 'categories') {
    getEnvironment().openRoute({
      params: {},
      route: page.route
    })
  }
}
