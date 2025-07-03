import type { RouteName } from '../router.ts'
import { addPage } from './add.ts'
import {
  createRedirectPage,
  createSimplePage,
  type PageCreator
} from './common.ts'
import { exportPage } from './export.ts'
import { feedsByCategoriesPage } from './feeds-by-categories.ts'
import { fastPage, slowPage } from './feeds.ts'
import { homePage } from './home.ts'
import { importPage } from './import.ts'
import { startPage } from './start.ts'

export type { AddPage } from './add.ts'
export * from './common.ts'
export type { ExportPage } from './export.ts'
export type { FeedsByCategoriesPage } from './feeds-by-categories.ts'
export type { FastPage, SlowPage } from './feeds.ts'
export type { HomePage } from './home.ts'
export type { ImportPage } from './import.ts'
export type { StartPage } from './start.ts'

export const pages = {
  about: createSimplePage('about'),
  add: addPage,
  download: createSimplePage('download'),
  export: exportPage,
  fast: fastPage,
  feeds: createRedirectPage('feeds', 'add'),
  feedsByCategories: feedsByCategoriesPage,
  home: homePage,
  import: importPage,
  interface: createSimplePage('interface'),
  notFound: createSimplePage('notFound'),
  profile: createSimplePage('profile'),
  refresh: createSimplePage('refresh'),
  settings: createRedirectPage('settings', 'interface'),
  signin: createSimplePage('signin'),
  slow: slowPage,
  start: startPage,
  welcome: createSimplePage('welcome')
} satisfies {
  [Name in RouteName]: Name extends 'fast' | 'slow'
    ? PageCreator<'fast' | 'slow'>
    : PageCreator<Name>
}

export type Pages = typeof pages

export type Page<Name extends RouteName = RouteName> = ReturnType<Pages[Name]>
