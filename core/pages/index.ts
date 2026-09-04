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
import { fatalPage } from './fatal.ts'
import { feedsByCategoriesPage } from './feeds-by-categories.ts'
import { fastPage, slowPage } from './feeds.ts'
import { homePage } from './home.ts'
import { importPage } from './import.ts'
import { menuPage } from './menu.ts'
import { reloginPage } from './relogin.ts'
import { signUpPage } from './sign-up.ts'
import { startPage } from './start.ts'
import { storagePage } from './storage.ts'

export type { AboutPage } from './about.ts'
export type { AddPage } from './add.ts'
export type { CloudPage } from './cloud.ts'
export * from './common.ts'
export type { ExportPage } from './export.ts'
export type { FatalPage } from './fatal.ts'
export type { FeedsByCategoriesPage } from './feeds-by-categories.ts'
export type { FeedsPage } from './feeds.ts'
export type { HomePage } from './home.ts'
export type { ImportPage } from './import.ts'
export type { MenuPage } from './menu.ts'
export type { ReloginPage } from './relogin.ts'
export type { SignUpPage } from './sign-up.ts'
export type { StartPage } from './start.ts'
export type { StoragePage } from './storage.ts'

export const pages = {
  about: aboutPage,
  add: addPage,
  cloud: cloudPage,
  network: createSimplePage('network'),
  export: exportPage,
  fast: fastPage,
  fatal: fatalPage,
  feeds: createRedirectPage('feeds', 'add'),
  feedsByCategories: feedsByCategoriesPage,
  home: homePage,
  import: importPage,
  interface: createSimplePage('interface'),
  menu: menuPage,
  relogin: reloginPage,
  settings: createRedirectPage('settings', 'interface'),
  signUp: signUpPage,
  slow: slowPage,
  start: startPage,
  storage: storagePage,
  welcome: createSimplePage('welcome')
} satisfies {
  [Name in RouteName]: Name extends 'fast' | 'slow'
    ? PageCreator<'fast' | 'slow'>
    : PageCreator<Name>
}

export type Pages = typeof pages

export type Page<Name extends RouteName> = ReturnType<Pages[Name]>
