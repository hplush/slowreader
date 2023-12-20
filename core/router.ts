import { computed, type ReadableAtom } from 'nanostores'

import { onEnvironment } from './environment.js'
import { hasFeeds } from './feed.js'
import { userId } from './settings.js'

export interface Routes {
  about: {}
  add: {}
  download: {}
  fast: {}
  feed: { id: string }
  feeds: {}
  home: {}
  interface: {}
  notFound: {}
  preview: { url: string }
  profile: {}
  refresh: {}
  settings: {}
  signin: {}
  slowAll: {}
  start: {}
  subscriptions: {}
  welcome: {}
}

export type RouteName = keyof Routes

export type BaseRoute<Name extends RouteName = RouteName> = Name extends string
  ? { params: Routes[Name]; route: Name }
  : never

export type BaseRouter = ReadableAtom<BaseRoute | undefined>

export type AppRoute = BaseRoute & {
  redirect: boolean
}

const GUEST = new Set<AppRoute['route']>(['start', 'signin'])

const SETTINGS = new Set<AppRoute['route']>([
  'interface',
  'profile',
  'about',
  'download'
])

const MANAGE = new Set<AppRoute['route']>(['add', 'preview', 'feeds', 'feed'])

function redirect<Name extends keyof Routes>(
  route: Name,
  params: Routes[Name]
): AppRoute {
  // @ts-expect-error Too complex types
  return { params, redirect: true, route }
}

function open<Name extends keyof Routes>(
  route: Name,
  params: Routes[Name]
): AppRoute {
  // @ts-expect-error Too complex types
  return { params, redirect: false, route }
}

function getRoute(
  page: BaseRoute | undefined,
  user: string | undefined,
  withFeeds: boolean | undefined
): AppRoute {
  if (!page) {
    return open('notFound', {})
  } else if (user) {
    if (GUEST.has(page.route) || page.route === 'home') {
      if (withFeeds) {
        return redirect('slowAll', {})
      } else {
        return redirect('welcome', {})
      }
    } else if (page.route === 'welcome' && withFeeds) {
      return redirect('slowAll', {})
    } else if (page.route === 'settings') {
      return redirect('interface', {})
    }
  } else if (!GUEST.has(page.route)) {
    return open('start', {})
  }
  return open(page.route, page.params)
}

export let router: ReadableAtom<AppRoute>

onEnvironment(({ baseRouter }) => {
  router = computed([baseRouter, userId, hasFeeds], (page, user, withFeeds) => {
    return getRoute(page, user, withFeeds)
  })
})

export function isFastRoute(route: AppRoute): boolean {
  return route.route === 'fast'
}

export function isSlowRoute(route: AppRoute): boolean {
  return route.route === 'slowAll'
}

export function isGuestRoute(route: AppRoute): boolean {
  return GUEST.has(route.route)
}

export function isSettingsRoute(route: AppRoute): boolean {
  return SETTINGS.has(route.route)
}

export function isManageRoute(route: AppRoute): boolean {
  return MANAGE.has(route.route)
}
