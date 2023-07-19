import { computed, type ReadableAtom, type StoreValue } from 'nanostores'

import { userId } from '../local-settings/index.js'

export interface Routes {
  add: {}
  fast: {}
  home: {}
  notFound: {}
  preview: { url: string }
  signin: {}
  slowAll: {}
  start: {}
  subscriptions: {}
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
  user: string | undefined
): AppRoute {
  if (!page) {
    return open('notFound', {})
  } else if (user) {
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

type RouterRoutes<Router extends BaseRouter> = {
  [R in Exclude<StoreValue<Router>, undefined> as R['route']]: R['params']
}

type ExactType<Good, A, B> = A extends B ? (B extends A ? Good : never) : never

type ValidateRouter<Router extends BaseRouter> = ExactType<
  Router,
  RouterRoutes<Router>,
  Routes
>

export function createAppRouter<Router extends BaseRouter>(
  base: ValidateRouter<Router>
): ReadableAtom<AppRoute> {
  return computed([base, userId], getRoute)
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
