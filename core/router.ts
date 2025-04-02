import { atom, computed, type ReadableAtom } from 'nanostores'

import {
  getEnvironment,
  onEnvironment,
  setBaseTestRoute
} from './environment.ts'
import { fastCategories } from './fast.ts'
import { hasFeeds } from './feed.ts'
import { computeFrom, readonlyExport } from './lib/stores.ts'
import { userId } from './settings.ts'
import { slowCategories } from './slow.ts'

export interface Routes {
  about: {}
  add: { candidate: string | undefined; url: string | undefined }
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
  welcome: {}
}

export const popupNames = { feed: true, feedUrl: true, post: true }

export type PopupName = keyof typeof popupNames

export type PopupRoute = { param: string; popup: PopupName }

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
  ? {
      params: Routes[Name]
      popups: PopupRoute[]
      redirect?: boolean
      route: Name
    }
  : never

type StringParams<Object> = {
  [K in keyof Object]: Object[K] extends string ? Object[K] : Object[K] | string
}

export type BaseRoute<Name extends RouteName = RouteName> = Name extends string
  ? { hash: string; params: StringParams<Routes[Name]>; route: Name }
  : never

export type BaseRouter = ReadableAtom<BaseRoute | undefined>

const GUEST = new Set<RouteName>(['signin', 'start'])

const SETTINGS = new Set<RouteName>([
  'about',
  'download',
  'export',
  'import',
  'interface',
  'profile'
])

const ORGANIZE = new Set<RouteName>(['add', 'categories'])

function open(route: ParamlessRouteName): Route {
  return { params: {}, popups: [], route }
}

function redirect(route: Route): Route {
  return { ...route, redirect: true }
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

let $router = atom<Route>({ params: {}, popups: [], route: 'home' })

function checkPopupName(
  popup: string | undefined
): popup is keyof typeof popupNames {
  return !!popup && popup in popupNames
}

function parsePopups(hash: string): PopupRoute[] {
  let popups: PopupRoute[] = []
  let parts = hash.split(',')
  for (let part of parts) {
    let [popup, param] = part.split('=', 2)
    if (checkPopupName(popup) && param) {
      popups.push({ param, popup })
    }
  }
  return popups
}

export const router = readonlyExport($router)

onEnvironment(({ baseRouter }) => {
  return computeFrom(
    $router,
    [baseRouter, userId, hasFeeds, fastCategories, slowCategories],
    (route, user, withFeeds, fast, slowUnread) => {
      if (!route) {
        return open('notFound')
      } else if (!user) {
        if (!GUEST.has(route.route)) {
          return open('start')
        } else {
          return { params: route.params, popups: [], route: route.route }
        }
      } else {
        let popups = parsePopups(route.hash)
        if (GUEST.has(route.route) || route.route === 'home') {
          if (withFeeds) {
            return redirect({ params: {}, popups, route: 'slow' })
          } else {
            return redirect(open('welcome'))
          }
        } else if (route.route === 'welcome' && withFeeds) {
          return redirect(open('slow'))
        } else if (route.route === 'settings') {
          return redirect(open('interface'))
        } else if (route.route === 'feeds') {
          return redirect({
            params: { candidate: undefined, url: undefined },
            popups,
            route: 'add'
          })
        } else if (route.route === 'fast') {
          if (!route.params.category && !fast.isLoading) {
            return redirect({
              params: { category: fast.categories[0].id },
              popups,
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
                params: {
                  ...route.params,
                  since
                },
                popups,
                route: route.route
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
                  popups,
                  route: 'slow'
                })
              }
            }
          }

          if (route.params.page) {
            return validateNumber(route.params.page, page => {
              return {
                params: {
                  ...route.params,
                  page
                },
                popups,
                route: route.route
              }
            })
          } else {
            return {
              params: {
                ...route.params,
                page: 1
              },
              popups,
              route: 'slow'
            }
          }
        }
        return { params: route.params, popups, route: route.route }
      }
    },
    (oldRoute, newRoute) => {
      return (
        oldRoute.route === newRoute.route &&
        JSON.stringify(oldRoute.params) === JSON.stringify(newRoute.params) &&
        JSON.stringify(oldRoute.popups) === JSON.stringify(newRoute.popups)
      )
    }
  )
})

export function isGuestRoute(route: Route): boolean {
  return GUEST.has(route.route)
}

export function isOtherRoute(route: Route): boolean {
  return SETTINGS.has(route.route) || ORGANIZE.has(route.route)
}

export function backToFirstStep(): void {
  let back = backRoute.get()
  if (back) {
    getEnvironment().openRoute(back)
  }
}

// TODO: Remove on moving to popups
export const backRoute = computed(
  $router,
  ({ params, route }): Route | undefined => {
    if (route === 'add' && params.candidate) {
      return {
        params: { candidate: undefined, url: params.url },
        popups: [],
        route: 'add'
      }
    } else if (route === 'categories' && params.feed) {
      return {
        params: {},
        popups: [],
        route: 'categories'
      }
    } else if (route === 'fast' && params.post) {
      return {
        params: { category: params.category },
        popups: [],
        route: 'fast'
      }
    } else if (route === 'slow' && params.post) {
      return {
        params: { feed: params.feed },
        popups: [],
        route: 'slow'
      }
    } else if (route === 'export' && params.format) {
      return {
        params: { format: undefined },
        popups: [],
        route: 'export'
      }
    }
  }
)

export function onNextRoute(cb: (route: Route) => void): void {
  let unbind = $router.listen(route => {
    unbind()
    cb(route)
  })
}

export function addPopup(
  hash: string,
  popup: PopupName,
  param: string
): string {
  let add = `${popup}=${param}`
  return hash === '' ? add : `${hash},${add}`
}

export function removeLastPopup(hash: string): string {
  return hash.split(',').slice(0, -1).join(',')
}

export function openTestPopup(popup: PopupName, param: string): void {
  let route = getEnvironment().baseRouter.get() ?? { hash: '' }
  setBaseTestRoute({
    params: {},
    route: 'start',
    ...route,
    hash: addPopup(route.hash, popup, param)
  })
}

export function closeLastTestPopup(): void {
  let route = getEnvironment().baseRouter.get() ?? { hash: '' }
  setBaseTestRoute({
    params: {},
    route: 'start',
    ...route,
    hash: removeLastPopup(route.hash)
  })
}
