import { atom, effect, type ReadableAtom } from 'nanostores'

import { getEnvironment, onEnvironment } from './environment.ts'
import { NotFoundError } from './not-found.ts'
import type { ReaderName } from './readers/index.ts'
import { userId } from './settings.ts'

export interface Routes {
  about: {}
  add: { url?: string }
  download: {}
  export: {}
  fast: {
    category?: string
    feed?: string
    reader?: ReaderName
    since?: number
  }
  feeds: {}
  feedsByCategories: {}
  home: {}
  import: {}
  interface: {}
  notFound: {}
  profile: {}
  settings: {}
  signin: {}
  signup: {}
  slow: {
    category?: string
    feed?: string
    reader?: ReaderName
    since?: number
  }
  start: {}
  welcome: {}
}

export const popupNames = {
  feed: true,
  feedUrl: true,
  post: true,
  refresh: true
}

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

export const FEED_ROUTES = [
  'add',
  'feedsByCategories'
] as const satisfies RouteName[]

export const SETTINGS_ROUTES = [
  'interface',
  'download',
  'import',
  'export',
  'profile',
  'about'
] as const satisfies RouteName[]

export type OtherName =
  | (typeof FEED_ROUTES)[number]
  | (typeof SETTINGS_ROUTES)[number]

const GUEST = new Set<RouteName>(['signin', 'start'])

const BOTH = new Set<RouteName>(['notFound', 'signup'])

const FEEDS = new Set<RouteName>(FEED_ROUTES)

const SETTINGS = new Set<RouteName>(SETTINGS_ROUTES)

function open(route: ParamlessRouteName): Route {
  return { params: {}, popups: [], route }
}

function redirect(route: Route): Route {
  return { ...route, redirect: true }
}

function validateValues<const Values extends string[]>(
  value: string | undefined,
  list: Values
): undefined | Values[number] {
  if (typeof value === 'undefined' || list.includes(value)) {
    return value
  } else {
    throw new NotFoundError()
  }
}

function validateNumber(
  value: number | string | undefined
): number | undefined {
  if (typeof value === 'number') {
    return value
  } else if (typeof value === 'undefined') {
    return value
  } else if (/^\d+$/.test(value)) {
    return parseInt(value)
  } else {
    throw new NotFoundError()
  }
}

export const router = atom<Route>({ params: {}, popups: [], route: 'home' })

function checkPopupName(
  popup: string | undefined
): popup is keyof typeof popupNames {
  return !!popup && popup in popupNames
}

/**
 * Parses popup routes from hash string format `popup=param,popup2=param2`
 * into an array of popup route objects.
 */
export function parsePopups(hash: string): PopupRoute[] {
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

onEnvironment(({ baseRouter }) => {
  return effect([baseRouter, userId], (route, user) => {
    let popups = user && route ? parsePopups(route.hash) : []
    let nextRoute: Route
    try {
      if (!route) {
        nextRoute = open('notFound')
      } else if (!user && !GUEST.has(route.route) && !BOTH.has(route.route)) {
        nextRoute = open('start')
      } else if (user && GUEST.has(route.route)) {
        nextRoute = redirect(open('home'))
      } else if (route.route === 'fast' || route.route === 'slow') {
        nextRoute = {
          params: {
            ...route.params,
            reader: validateValues(route.params.reader, ['feed', 'list']),
            since: validateNumber(route.params.since)
          },
          popups,
          route: route.route
        }
      } else {
        nextRoute = { params: route.params, popups, route: route.route }
      }
    } catch (e) {
      if (e instanceof NotFoundError) {
        nextRoute = open('notFound')
      } else {
        /* node:coverage ignore next 2 */
        throw e
      }
    }
    router.set(nextRoute)
  })
})

export function isOtherRoute(route: Route): boolean {
  return SETTINGS.has(route.route) || FEEDS.has(route.route)
}

/**
 * Converts popup routes to a hash string format `popup=param,popup2=param2`
 */
export function stringifyPopups(popups: PopupRoute[]): string {
  return popups
    .map(({ param, popup }) => `${popup}=${param}`)
    .filter(i => i !== '')
    .join(',')
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

export function openPopup(popup: PopupName, param: string): void {
  let currentRoute = router.get()
  getEnvironment().openRoute({
    ...currentRoute,
    popups: currentRoute.popups.concat({ param, popup })
  })
}

export function closeLastPopup(): void {
  let currentRoute = router.get()
  getEnvironment().openRoute({
    ...currentRoute,
    popups: currentRoute.popups.slice(0, -1)
  })
}

export function closeAllPopups(): void {
  getEnvironment().openRoute({
    ...router.get(),
    popups: []
  })
}
