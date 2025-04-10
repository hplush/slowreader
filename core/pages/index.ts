import { atom } from 'nanostores'

import type { RouteName, Routes } from '../router.ts'
import { add } from './add.ts'
import {
  type BasePage,
  createPage,
  createRedirectPage,
  createSimplePage,
  type PageCreator
} from './common.ts'
import { feedsByCategories } from './feeds-by-categories.ts'
import { home } from './home.ts'

export type { AddPage } from './add.ts'
export * from './common.ts'
export type { FeedsByCategoriesPage } from './feeds-by-categories.ts'
export type { HomePage } from './home.ts'

// TODO: Remove after refactoring
/* c8 ignore start */
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
/* c8 ignore end */

export const pages = {
  about: createSimplePage('about'),
  add,
  download: createSimplePage('download'),
  export: underConstruction('export', []),
  fast: underConstruction('fast', ['category', 'post', 'since']),
  feeds: createRedirectPage('feeds', 'add'),
  feedsByCategories,
  home,
  import: underConstruction('import', []),
  interface: createSimplePage('interface'),
  notFound: createSimplePage('notFound'),
  profile: createSimplePage('profile'),
  refresh: createSimplePage('refresh'),
  settings: createRedirectPage('settings', 'interface'),
  signin: createSimplePage('signin'),
  slow: underConstruction('slow', ['feed', 'page', 'post']),
  start: createSimplePage('start'),
  welcome: createSimplePage('welcome')
} satisfies {
  [Name in RouteName]: PageCreator<Name>
}

export type Pages = typeof pages

export type Page<Name extends RouteName = RouteName> = ReturnType<Pages[Name]>
