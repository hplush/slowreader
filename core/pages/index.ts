import { atom } from 'nanostores'

import type { RouteName, Routes } from '../router.ts'
import { add } from './add.ts'
import {
  type BasePage,
  createPage,
  createSimplePage,
  type PageCreator
} from './common.ts'

export type { AddPage } from './add.ts'
export * from './common.ts'

// TODO: Remove after refactoring
export function underConstruction<Name extends RouteName>(
  route: Name,
  params: (keyof Routes[Name])[]
): PageCreator<Name> {
  return createPage(route, () => {
    let result = { params: {} } as BasePage<Name>
    for (let param of params) {
      result.params[param] = atom()
    }
    result.underConstruction = true
    return result
  })
}

export const pages = {
  about: underConstruction('about', []),
  add,
  categories: underConstruction('categories', ['feed']),
  download: underConstruction('download', []),
  export: underConstruction('export', []),
  fast: underConstruction('fast', ['category', 'post', 'since']),
  feeds: underConstruction('feeds', []),
  home: underConstruction('home', []),
  import: underConstruction('import', []),
  interface: underConstruction('interface', []),
  notFound: createSimplePage('notFound'),
  profile: underConstruction('profile', []),
  refresh: underConstruction('refresh', []),
  settings: underConstruction('settings', []),
  signin: underConstruction('signin', []),
  slow: underConstruction('slow', ['feed', 'page', 'post']),
  start: underConstruction('start', []),
  welcome: underConstruction('welcome', [])
} satisfies {
  [Name in RouteName]: PageCreator<Name>
}

export type Pages = typeof pages

export type Page<Name extends RouteName = RouteName> = ReturnType<Pages[Name]>
