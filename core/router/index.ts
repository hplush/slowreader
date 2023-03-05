import { computed, ReadableAtom } from 'nanostores'

import { localSettings, LocalSettingsValue } from '../local-settings/index.js'

export interface Routes {
  notFound: {}
  home: {}
  slowAll: {}
  fast: {}
  start: {}
  signin: {}
  add: {}
  preview: { url: string }
}

export type BaseRoute<Name extends keyof Routes = keyof Routes> =
  Name extends string ? { route: Name; params: Routes[Name] } : never

export type BaseRouter = ReadableAtom<BaseRoute | undefined>

export type AppRoute = BaseRoute & {
  redirect: boolean
}

const GUEST = new Set<AppRoute['route']>(['start', 'signin'])

function redirect<Name extends keyof Routes>(
  route: Name,
  params: Routes[Name]
): AppRoute {
  // @ts-expect-error Too complex types
  return { route, params, redirect: true }
}

function open<Name extends keyof Routes>(
  route: Name,
  params: Routes[Name]
): AppRoute {
  // @ts-expect-error Too complex types
  return { route, params, redirect: false }
}

function getRoute(
  page: BaseRoute | undefined,
  settings: LocalSettingsValue
): AppRoute {
  if (!page) {
    return open('notFound', {})
  } else if (settings.userId) {
    if (GUEST.has(page.route)) {
      return redirect('slowAll', {})
    } else if (page.route === 'home') {
      return redirect('slowAll', {})
    }
  } else if (!GUEST.has(page.route)) {
    return open('start', {})
  }
  return open(page.route, page.params)
}

export function createAppRouter(base: BaseRouter): ReadableAtom<AppRoute> {
  return computed([base, localSettings], getRoute)
}

export function isFastRoute(route: AppRoute): boolean {
  return route.route === 'fast'
}

export function isSlowRoute(route: AppRoute): boolean {
  return route.route === 'slowAll'
}

export function isGuestRoute(route: AppRoute): boolean {
  return GUEST.has(route.route)
}
