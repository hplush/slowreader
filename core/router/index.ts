import { RouteParams, Router, Page, Params } from '@nanostores/router'
import { computed, ReadableAtom } from 'nanostores'

import { localSettings, LocalSettingsValue } from '../local-settings/index.js'

export interface Routes {
  notFound: void
  home: void
  slowAll: void
  fast: void
  start: void
  signin: void
  add: void
  preview: 'url'
}

const GUEST = new Set<AppRoute['route']>(['start', 'signin'])

export type BaseRouter = Router<Routes>

export type AppRoute = Omit<Page<Routes, keyof Routes>, 'path'> & {
  redirect: boolean
}

export type Route<Name extends keyof Routes = keyof Routes> = Name extends never
  ? never
  : {
      route: Name
      params: Routes[Name] extends string ? Params<Routes[Name]> : never
      redirect: boolean
    }

function data<Name extends keyof Routes>(
  route: Name,
  ...params: RouteParams<Routes, Name>
): Route {
  // Types are too tricky here
  // @ts-expect-error
  return { route, params: params.length > 0 ? params[0] : {} }
}

function redirect<Name extends keyof Routes>(
  route: Name,
  ...params: RouteParams<Routes, Name>
): Route {
  return { ...data(route, ...params), redirect: true }
}

function open<Name extends keyof Routes>(
  route: Name,
  ...params: RouteParams<Routes, Name>
): Route {
  return { ...data(route, ...params), redirect: false }
}

function getRoute(
  page: Page<Routes> | undefined,
  settings: LocalSettingsValue
): Route {
  if (!page) {
    return open('notFound')
  } else if (settings.userId) {
    if (GUEST.has(page.route)) {
      return redirect('slowAll')
    } else if (page.route === 'home') {
      return redirect('slowAll')
    }
  } else if (!GUEST.has(page.route)) {
    return open('start')
  }
  return { route: page.route, params: page.params, redirect: false }
}

export function createAppRouter(base: BaseRouter): ReadableAtom<Route> {
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
