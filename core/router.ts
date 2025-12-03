import { atom, computed, effect, type ReadableAtom } from 'nanostores'

import { getEnvironment, onEnvironment } from './environment.ts'
import { NotFoundError } from './not-found.ts'
import { userId } from './settings.ts'

export interface Routes {
  about: {}
  add: { url?: string }
  download: {}
  export: {}
  fast: {
    category?: string
    from?: number
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
    feed?: string
    from?: number
  }
  start: {}
  welcome: {}
}

export const popupNames = {
  feed: true,
  post: true,
  refresh: true
}

export type PopupName = keyof typeof popupNames

export type PopupRoute = { readonly param: string; readonly popup: PopupName }

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
      readonly params: Routes[Name]
      readonly popups: readonly PopupRoute[]
      readonly redirect?: boolean
      readonly route: Name
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
  'feedsByCategories',
  'import',
  'export'
] as const satisfies RouteName[]

export const SETTINGS_ROUTES = [
  'interface',
  'download',
  'profile',
  'about'
] as const satisfies RouteName[]

// @ts-expect-error TODO: Remove until we have offline mode
delete SETTINGS_ROUTES.splice(1, 1)

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
  let parts = hash.replace(/^#/, '').split(',')
  for (let part of parts) {
    let [popup, param] = part.split('=', 2)
    if (checkPopupName(popup) && param) {
      popups.push({ param: decodeURIComponent(param), popup })
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
            from: validateNumber(route.params.from)
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
        throw e
      }
    }
    if (JSON.stringify(router.get()) !== JSON.stringify(nextRoute)) {
      router.set(nextRoute)
    }
  })
})

export function isOtherRoute(route: Route): boolean {
  return SETTINGS.has(route.route) || FEEDS.has(route.route)
}

/**
 * Converts popup routes to a hash string format `popup=param,popup2=param2`
 */
export function stringifyPopups(popups: readonly PopupRoute[]): string {
  return popups
    .map(({ param, popup }) => `${popup}=${encodeURIComponent(param)}`)
    .filter(i => i !== '')
    .join(',')
}

export function addPopup(
  route: Route | undefined,
  popup: PopupName,
  param: string
): string {
  let next = route ? [...route.popups] : []
  let last = next[next.length - 1]
  if (last?.popup === popup) {
    next[next.length - 1] = { param, popup }
  } else {
    next.push({ param, popup })
  }
  return stringifyPopups(next)
}

export function removeLastPopup(hash: string): string {
  return hash.split(',').slice(0, -1).join(',')
}

export function setPopups(popups: [PopupName, string][]): void {
  let currentRoute = router.get()
  getEnvironment().openRoute({
    ...currentRoute,
    popups: popups.map(([popup, param]) => ({ param, popup }))
  })
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

export let redirectMode = false
let nestedRedirect = 0

export async function nextRouteIsRedirect(
  cb: () => Promise<void> | void
): Promise<void> {
  redirectMode = true
  nestedRedirect += 1
  await cb()
  nestedRedirect -= 1
  if (nestedRedirect === 0) redirectMode = false
}

export const openedPost = computed(router, page => {
  let first = page.popups[0]
  if (!first) {
    return undefined
  } else if (first.popup === 'post') {
    return first.param.replace(/^\w+:/, '')
  }
})
