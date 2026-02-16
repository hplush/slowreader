import type { RouteName } from '../router.ts'
import { aboutPage } from './about.ts'
import { addPage } from './add.ts'
import { cloudPage } from './cloud.ts'
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
import { reloginPage } from './relogin.ts'
import { signUpPage } from './sign-up.ts'
import { startPage } from './start.ts'

export type { AboutPage } from './about.ts'
export type { AddPage } from './add.ts'
export type { CloudPage } from './cloud.ts'
export * from './common.ts'
export type { ExportPage } from './export.ts'
export type { FeedsByCategoriesPage } from './feeds-by-categories.ts'
export type { FeedsPage } from './feeds.ts'
export type { HomePage } from './home.ts'
export type { ImportPage } from './import.ts'
export type { ReloginPage } from './relogin.ts'
export type { SignUpPage } from './sign-up.ts'
export type { StartPage } from './start.ts'

export const pages = {
  about: aboutPage,
  add: addPage,
  cloud: cloudPage,
  download: createSimplePage('download'),
  export: exportPage,
  fast: fastPage,
  feeds: createRedirectPage('feeds', 'add'),
  feedsByCategories: feedsByCategoriesPage,
  home: homePage,
  import: importPage,
  interface: createSimplePage('interface'),
  notFound: createSimplePage('notFound'),
  outdated: createSimplePage('outdated'),
  relogin: reloginPage,
  settings: createRedirectPage('settings', 'interface'),
  signUp: signUpPage,
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
