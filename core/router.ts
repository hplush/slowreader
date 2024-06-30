import { atom, computed, type ReadableAtom } from 'nanostores'

import { getEnvironment, onEnvironment } from './environment.js'
import { fastCategories } from './fast.js'
import { hasFeeds } from './feed.js'
import { computeFrom, readonlyExport } from './lib/stores.js'
import { userId } from './settings.js'
import { slowCategories } from './slow.js'

export interface Routes {
  about: {}
  add: { candidate?: string; url?: string }
  categories: { feed?: string }
  download: {}
  export: { format?: string }
  fast: { category?: string; post?: string; since?: number }
  feeds: {}
  home: {}
  import: {}
  interface: {}
  notFound: {}
  profile: {}
  refresh: {}
  settings: {}
  signin: {}
  slow: { feed?: string; page?: number; post?: string }
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
  'download',
  'export',
  'import'
])

const ORGANIZE = new Set<RouteName>(['add', 'categories'])

function open(route: ParamlessRouteName | Route): Route {
  if (typeof route === 'string') route = { params: {}, route } as Route
  return route
}

function redirect(route: ParamlessRouteName | Route): Route {
  return { ...open(route), redirect: true }
}

function validateNumber(
  value: number | string,
  cb: (fixed: number) => Route
): Route {
  if (typeof value === 'number') {
    return cb(value)
  } else if (/^\d+$/.test(value)) {
    return cb(parseInt(value))
  } else {
    return open('notFound')
  }
}

let $router = atom<Route>({ params: {}, route: 'home' })

export const router = readonlyExport($router)

onEnvironment(({ baseRouter }) => {
  return computeFrom(
    $router,
    [baseRouter, userId, hasFeeds, fastCategories, slowCategories],
    (route, user, withFeeds, fast, slowUnread) => {
      if (!route) {
        return open('notFound')
      } else if (user) {
        if (GUEST.has(route.route) || route.route === 'home') {
          if (withFeeds) {
            return redirect({ params: {}, route: 'slow' })
          } else {
            return redirect('welcome')
          }
        } else if (route.route === 'welcome' && withFeeds) {
          return redirect('slow')
        } else if (route.route === 'settings') {
          return redirect('interface')
        } else if (route.route === 'feeds') {
          return redirect('add')
        } else if (route.route === 'fast') {
          if (!route.params.category && !fast.isLoading) {
            return redirect({
              params: { category: fast.categories[0].id },
              route: 'fast'
            })
          }
          if (route.params.category && !fast.isLoading) {
            let category = fast.categories.find(
              i => i.id === route.params.category
            )
            if (!category) {
              return open('notFound')
            }
          }
          if (route.params.since) {
            return validateNumber(route.params.since, since => {
              return {
                ...route,
                params: {
                  ...route.params,
                  since
                }
              }
            })
          }
        } else if (route.route === 'slow') {
          if (!route.params.feed && !slowUnread.isLoading) {
            let firstCategory = slowUnread.tree[0]
            if (firstCategory) {
              let feeds = firstCategory[1]
              let feedData = feeds[0]
              if (feedData) {
                return redirect({
                  params: { feed: feedData[0].id || '' },
                  route: 'slow'
                })
              }
            }
          }

          if (route.params.page) {
            return validateNumber(route.params.page, page => {
              return {
                ...route,
                params: {
                  ...route.params,
                  page
                }
              }
            })
          } else {
            return open({
              params: {
                ...route.params,
                page: 1
              },
              route: 'slow'
            })
          }
        }
      } else if (!GUEST.has(route.route)) {
        return open('start')
      }
      return route
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

export function isOtherRoute(route: Route): boolean {
  return SETTINGS.has(route.route) || ORGANIZE.has(route.route)
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

export function backToFirstStep(): void {
  let back = backRoute.get()
  if (back) {
    getEnvironment().openRoute(back)
  }
}

export const backRoute = computed<Route | undefined, typeof router>(
  router,
  ({ params, route }) => {
    if (route === 'add' && params.candidate) {
      return {
        params: { url: params.url },
        route: 'add'
      }
    } else if (route === 'categories' && params.feed) {
      return {
        params: {},
        route: 'categories'
      }
    } else if (route === 'fast' && params.post) {
      return {
        params: { category: params.category },
        route: 'fast'
      }
    } else if (route === 'slow' && params.post) {
      return {
        params: { feed: params.feed },
        route: 'slow'
      }
    } else if (route === 'export' && params.format) {
      return {
        params: { format: undefined },
        route: 'export'
      }
    }
  }
)
