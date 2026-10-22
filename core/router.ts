import { atom, computed, effect, type ReadableAtom } from 'nanostores'

import { getEnvironment, onEnvironment } from './environment.ts'
import { type Fatal, fatalReasons } from './errors.ts'
import { userId } from './settings.ts'

export interface Routes {
  about: {}
  accounts: {}
  add: { url?: string }
  cloud: {}
  network: {}
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
  root: {}
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
  account: true,
  feed: true,
  passkey: true,
  post: true,
  refresh: true,
  session: true
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

function notFound(): Route {
  return { params: { reason: 'notFound' }, popups: [], route: 'fatal' }
}

function validParams(
  route: RouteName,
  params: Record<string, string>
): boolean {
  if (route === 'fatal' && typeof params.reason !== 'undefined') {
    return fatalReasons.some(i => i === params.reason)
  } else if (
    (route === 'fast' || route === 'slow') &&
    typeof params.from !== 'undefined'
  ) {
    return /^\d+(:.*)?$/.test(params.from)
  } else {
    return true
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
    if (param) popups.push({ param: decodeURIComponent(param), popup })
  }
  return popups
}

/**
 * Gives every client the same route: without empty params, unknown popups,
 * and with guards for guests and users. `replace` marks a guard redirect.
 */
function normalizeRoute(
  route: {
    params: Record<string, number | string | undefined>
    popups: readonly PopupRoute[]
    route: RouteName
  },
  user: string | undefined
): { replace: boolean; route: Route } {
  if (!user && !GUEST.has(route.route) && !BOTH.has(route.route)) {
    // Keeps URL to return to it after the sign in
    return { replace: false, route: open('start') }
  } else if (user && GUEST.has(route.route)) {
    return { replace: true, route: open('home') }
  }
  let params: Record<string, string> = {}
  for (let key in route.params) {
    let value = route.params[key]
    if (typeof value !== 'undefined' && value !== '') params[key] = `${value}`
  }
  if (!validParams(route.route, params)) {
    return { replace: false, route: notFound() }
  }
  let popups = user
    ? route.popups.filter(
        i => i.param !== '' && Object.hasOwn(popupNames, i.popup)
      )
    : []
  return {
    replace: false,
    route: { params, popups, route: route.route }
  }
}

function isSameRoute(a: Route, b: Route): boolean {
  let aParams: Record<string, string | undefined> = a.params
  let bParams: Record<string, string | undefined> = b.params
  let keys = Object.keys(aParams)
  return (
    a.route === b.route &&
    stringifyPopups(a.popups) === stringifyPopups(b.popups) &&
    keys.length === Object.keys(bParams).length &&
    keys.every(key => aParams[key] === bParams[key])
  )
}

onEnvironment(({ baseRouter }) => {
  return effect([baseRouter, userId], (base, user) => {
    let next = base
      ? normalizeRoute(
          {
            params: base.params,
            popups: parsePopups(base.hash),
            route: base.route
          },
          user
        )
      : { replace: false, route: notFound() }
    if (!isSameRoute(next.route, router.get())) router.set(next.route)
    // Page creation could already navigate to another route
    if (next.replace && isSameRoute(next.route, router.get())) {
      getEnvironment().openRoute(next.route, true)
    }
  })
})

let routerListenersRunning = false

/**
 * Changes current route. Pass a callback to build the new route from
 * the current one.
 *
 * @param replace Replace the current history entry instead of adding a new
 *                one, so the Back button skips the current route. Use it
 *                for redirects and URL corrections, which user did not ask.
 */
export function navigate(
  change: ((route: Route) => Route) | Route,
  replace = false
): void {
  let next = normalizeRoute(
    typeof change === 'function' ? change(router.get()) : change,
    userId.get()
  )
  if (isSameRoute(next.route, router.get())) return
  if (routerListenersRunning) {
    router.set(next.route)
  } else {
    routerListenersRunning = true
    try {
      router.set(next.route)
    } finally {
      routerListenersRunning = false
    }
    // Page creation could navigate again, and URL needs only the last route
    getEnvironment().openRoute(router.get(), replace || next.replace)
  }
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
  navigate(route => ({
    ...route,
    popups: popups.map(([popup, param]) => ({ param, popup }))
  }))
}

export function openPopup(popup: PopupName, param: string): void {
  navigate(route => ({
    ...route,
    popups: route.popups.concat({ param, popup })
  }))
}

export function closeLastPopup(): void {
  navigate(route => ({ ...route, popups: route.popups.slice(0, -1) }))
}

export function closeAllPopups(): void {
  navigate(route => ({ ...route, popups: [] }))
}

export const openedPost = computed(router, page => {
  let first = page.popups[0]
  if (!first) {
    return undefined
  } else if (first.popup === 'post') {
    return first.param.replace(/^(?:read:)?(?:id:)?/, '')
  }
})

export function isOpenedPost(
  opened: string | undefined,
  post: { id: string; url?: null | string }
): boolean {
  return !!opened && (opened === post.id || opened === post.url)
}
