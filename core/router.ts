import { atom, type ReadableAtom, type StoreValue } from 'nanostores'

import { userId } from './settings.js'

export interface Routes {
  add: {}
  fast: {}
  feed: { id: string }
  feeds: {}
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

let $router = atom<AppRoute>(open('start', {}))

export const router: ReadableAtom<AppRoute> = $router

type RouterRoutes<Router extends BaseRouter> = {
  [R in Exclude<StoreValue<Router>, undefined> as R['route']]: R['params']
}

type ExactType<Good, A, B> = A extends B ? (B extends A ? Good : never) : never

type ValidateRouter<Router extends BaseRouter> = ExactType<
  Router,
  RouterRoutes<Router>,
  Routes
>

let unbindPrev: (() => void) | undefined

export function setBaseRouter<Router extends BaseRouter>(
  base: ValidateRouter<Router>
): void {
  if (unbindPrev) {
    unbindPrev()
  }

  function set(): void {
    $router.set(getRoute(base.get(), userId.get()))
  }

  let unbindRouter = base.listen(set)
  let unbindUser = userId.listen(set)
  unbindPrev = () => {
    unbindRouter()
    unbindUser()
  }
  set()
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
