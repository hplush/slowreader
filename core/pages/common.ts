import { atom, computed, type ReadableAtom } from 'nanostores'

import {
  navigate,
  type ParamlessRouteName,
  router,
  type RouteName,
  type Routes
} from '../router.ts'

type Extra = {
  exit?: () => void
}

export type ParamStores<Name extends RouteName> = {
  [Param in keyof Routes[Name]]-?: ReadableAtom<Routes[Name][Param]>
}

/**
 * Keeps the last value after leaving the route, so the page will not react
 * on a missing param before it will be destroyed.
 */
export function routeParam<
  Name extends RouteName,
  Param extends keyof Routes[Name]
>(route: Name, param: Param): ReadableAtom<Routes[Name][Param]> {
  let last: Routes[Name][Param] | undefined
  return computed(router, current => {
    if (current.route === route) {
      last = (current.params as Routes[Name])[param]
    }
    return last as Routes[Name][Param]
  })
}

export type BasePage<Name extends RouteName = RouteName> = {
  destroy(): void
  hideBusy: ReadableAtom<boolean>
  hideMenu: ReadableAtom<boolean>
  readonly loading: ReadableAtom<boolean>
  params: ParamStores<Name>
  readonly route: Name
}

export interface PageCreator<
  Name extends RouteName,
  Rest extends Extra = Record<string, unknown>
> {
  (): BasePage<Name> & Rest
  cache?: BasePage<Name> & Rest
}

export function createPage<Name extends RouteName, Rest extends Extra>(
  route: Name,
  builder: () => { params: ParamStores<Name> } & Rest
): PageCreator<Name, Rest> {
  let creator: PageCreator<Name, Rest> = () => {
    if (!creator.cache) {
      let rest = builder()
      creator.cache = {
        destroy() {
          creator.cache?.exit?.()
          creator.cache = undefined
        },
        hideBusy: atom(false),
        hideMenu: atom(false),
        loading: atom(false),
        route,
        ...rest
      }
    }
    return creator.cache
  }
  return creator
}

export function createSimplePage<Name extends ParamlessRouteName>(
  route: Name
): PageCreator<Name> {
  return createPage(route, () => ({ params: {} as ParamStores<Name> }))
}

export function createRedirectPage<Name extends ParamlessRouteName>(
  route: Name,
  redirectTo: ParamlessRouteName
): PageCreator<Name> {
  return createPage(route, () => {
    navigate({ params: {}, popups: [], route: redirectTo }, true)
    return { loading: atom(true), params: {} as ParamStores<Name> }
  })
}
