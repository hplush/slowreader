import { atom, type ReadableAtom } from 'nanostores'

import type { ParamlessRouteName, RouteName, Routes } from '../router.ts'

type Extra = {
  destroy?: () => void
}

type ParamStores<Name extends RouteName> = {
  [Param in keyof Routes[Name]]-?: ReadableAtom<Routes[Name][Param]>
}

export type BasePage<Name extends RouteName = RouteName> = {
  destroy(): void
  readonly loading: ReadableAtom<boolean>
  readonly route: Name
  underConstruction?: boolean
} & ParamStores<Name>

export function createPage<Name extends RouteName, Rest extends Extra>(
  route: Name,
  builder: () => ParamStores<Name> & Rest
): BasePage<Name> & Rest {
  let rest = builder()
  return {
    destroy: rest.destroy ?? ((): void => {}),
    loading: atom(false),
    route,
    ...rest
  }
}

export function createSimplePage<Name extends ParamlessRouteName>(
  route: Name
): BasePage<Name> {
  return createPage(route, () => ({}) as ParamStores<Name>)
}
