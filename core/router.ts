import { atom, computed, effect, type ReadableAtom } from 'nanostores'

import { getEnvironment, onEnvironment } from './environment.ts'
import { type Fatal, fatalReasons, NotFoundError } from './errors.ts'
import { userId } from './settings.ts'

export interface Routes {
  about: {}
  add: { url?: string }
  cloud: {}
  download: {}
  export: {}
  fast: {
    category?: string
    from?: string
  }
  feeds: {}
  fatal: { reason?: Fatal['type'] }
  feedsByCategories: {}
  home: {}
  import: {}
  interface: {}
  menu: {}
  relogin: {}
  settings: {}
  signUp: {}
  slow: {
    feed?: string
    from?: string
  }
  start: {}
  storage: {}
  welcome: {}
}

export const popupNames = {
  feed: true,
  post: true,
  refresh: true
}

export type PopupName = keyof typeof popupNames

export type MenuType = 'fast' | 'other' | 'slow'

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

const GUEST = new Set<RouteName>(['start'])

const BOTH = new Set<RouteName>(['fatal', 'signUp'])

function open(route: ParamlessRouteName): Route {
  return { params: {}, popups: [], route }
}

function redirect(route: Route): Route {
  return { ...route, redirect: true }
}

function validateFrom(value: number | string | undefined): string | undefined {
  if (typeof value === 'undefined') {
    return value
  } else if (/^\d+(:.*)?$/.test(`${value}`)) {
    return `${value}`
  } else {
    throw new NotFoundError()
  }
}

function validateReason(value: string | undefined): Fatal['type'] | undefined {
  if (typeof value === 'undefined') return value
  let reason = fatalReasons.find(i => i === value)
  if (reason) {
    return reason
  } else {
    throw new NotFoundError()
  }
}

export const router = atom<Route>({ params: {}, popups: [], route: 'home' })

/**
 * Parses popup routes from hash string format `popup=param,popup2=param2`
 * into an array of popup route objects.
 */
export function parsePopups(hash: string): PopupRoute[] {
  let popups: PopupRoute[] = []
  for (let part of hash.replace(/^#/, '').split(',')) {
    let [popup, param] = part.split('=', 2) as [PopupName, string | undefined]
    if (param && popup in popupNames) {
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
        nextRoute = open('fatal')
      } else if (!user && !GUEST.has(route.route) && !BOTH.has(route.route)) {
        nextRoute = open('start')
      } else if (user && GUEST.has(route.route)) {
        nextRoute = redirect(open('home'))
      } else if (route.route === 'fatal') {
        nextRoute = {
          params: { reason: validateReason(route.params.reason) },
          popups,
          route: route.route
        }
      } else if (route.route === 'fast' || route.route === 'slow') {
        nextRoute = {
          params: {
            ...route.params,
            from: validateFrom(route.params.from)
          },
          popups,
          route: route.route
        }
      } else {
        nextRoute = { params: route.params, popups, route: route.route }
      }
    } catch (e) {
      if (e instanceof NotFoundError) {
        nextRoute = open('fatal')
      } else {
        throw e
      }
    }
    if (JSON.stringify(router.get()) !== JSON.stringify(nextRoute)) {
      router.set(nextRoute)
    }
  })
})

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
