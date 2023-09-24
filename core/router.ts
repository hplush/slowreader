import { atom, computed, type ReadableAtom } from 'nanostores'

import { client } from './client.js'
import { onEnvironment } from './environment.js'
import { getFeeds } from './feed.js'
import { userId } from './settings.js'

export interface Routes {
  add: {}
  fast: {}
  feed: { id: string }
  feeds: {}
  home: {}
  notFound: {}
  preview: { url: string }
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
  hasFeeds: boolean | undefined
): AppRoute {
  if (!page) {
    return open('notFound', {})
  } else if (user) {
    if (GUEST.has(page.route) || page.route === 'home') {
      if (hasFeeds) {
        return redirect('slowAll', {})
      } else {
        return redirect('welcome', {})
      }
    } else if (page.route === 'welcome' && hasFeeds) {
      return redirect('slowAll', {})
    }
  } else if (!GUEST.has(page.route)) {
    return open('start', {})
  }
  return open(page.route, page.params)
}

export let router: ReadableAtom<AppRoute>

onEnvironment(({ baseRouter }) => {
  let $hasFeeds = atom<boolean | undefined>(false)

  let unbindFeeds: (() => void) | undefined
  let unbindClient = client.subscribe(enabled => {
    if (enabled) {
      unbindFeeds = getFeeds().subscribe(feeds => {
        $hasFeeds.set(!feeds.isLoading && !feeds.isEmpty)
      })
    } else {
      unbindFeeds?.()
      unbindFeeds = undefined
    }
  })

  router = computed([baseRouter, userId, $hasFeeds], (page, user, hasFeeds) => {
    return getRoute(page, user, hasFeeds)
  })

  return () => {
    unbindClient()
    unbindFeeds?.()
  }
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
