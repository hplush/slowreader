import { atom, type ReadableAtom } from 'nanostores'

import type { ParamlessRouteName, RouteName, Routes } from '../router.ts'

type Extra = {
  exit?: () => void
}

type ParamStores<Name extends RouteName> = {
  [Param in keyof Routes[Name]]-?: ReadableAtom<Routes[Name][Param]>
}

export type BasePage<Name extends RouteName = RouteName> = {
  destroy(): void
  readonly loading: ReadableAtom<boolean>
  params: ParamStores<Name>
  readonly route: Name
  underConstruction?: boolean // TODO: Remove after refactoring
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
