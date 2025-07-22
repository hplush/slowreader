import { atom, type ReadableAtom, type WritableStore } from 'nanostores'

import { getEnvironment } from '../environment.ts'
import type { ParamlessRouteName, RouteName, Routes } from '../router.ts'

type Extra = {
  exit?: () => void
}

export type ParamStores<Name extends RouteName> = {
  [Param in keyof Routes[Name]]-?: WritableStore<Routes[Name][Param]>
}

export type BasePage<Name extends RouteName = RouteName> = {
  destroy(): void
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
    getEnvironment().openRoute(
      { params: {}, popups: [], route: redirectTo },
      true
    )
    return { loading: atom(true), params: {} as ParamStores<Name> }
  })
}
