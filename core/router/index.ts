import { RouteParams, Router, Page } from '@nanostores/router'
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
}

const GUEST = new Set(['start', 'signin'] as const)

export type BaseRouter = Router<Routes>

export type AppRoute = Omit<Page<Routes, keyof Routes>, 'path'> & {
  redirect: boolean
}

function data(
  route: string,
  params?: { [key: string]: string }
): Omit<Page<Routes>, 'path'> {
  return { route, params: params ?? {} }
}

function redirect<N extends keyof Routes>(
  route: N,
  ...params: RouteParams<Routes, N>
): AppRoute {
  return { ...data(route, params[0]), redirect: true }
}

function open<N extends keyof Routes>(
  route: N,
  ...params: RouteParams<Routes, N>
): AppRoute {
  return { ...data(route, params[0]), redirect: false }
}

function getRoute(
  page: Page<Routes> | undefined,
  settings: LocalSettingsValue
): AppRoute {
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

export function createAppRouter(base: BaseRouter): ReadableAtom<AppRoute> {
  return computed([base, localSettings], getRoute)
}

export function isFastRoutes(route: AppRoute): boolean {
  return route.route === 'fast'
}

export function isSlowRoutes(route: AppRoute): boolean {
  return route.route === 'slowAll'
}
