import type { RouteName } from '../router.ts'
import { aboutPage } from './about.ts'
import { accountsPage } from './accounts.ts'
import { addPage } from './add.ts'
import { categoriesPage } from './categories.ts'
import { cloudPage } from './cloud.ts'
import { coachPage } from './coach.ts'
import {
  createRedirectPage,
  createSimplePage,
  type PageCreator
} from './common.ts'
import { deadFeedsPage } from './dead-feeds.ts'
import { exportPage } from './export.ts'
import { fatalPage } from './fatal.ts'
import { fastPage, slowPage } from './feeds.ts'
import { historyPage } from './history.ts'
import { homePage } from './home.ts'
import { importPage } from './import.ts'
import { laterPage } from './later.ts'
import { menuPage } from './menu.ts'
import { reloginPage } from './relogin.ts'
import { signUpPage } from './sign-up.ts'
import { startPage } from './start.ts'
import { storagePage } from './storage.ts'
import { welcomePage } from './welcome.ts'

export type { AboutPage } from './about.ts'
export type { AccountsPage, AccountsStep } from './accounts.ts'
export type { AddPage } from './add.ts'
export type { CategoriesPage } from './categories.ts'
export type { CloudPage } from './cloud.ts'
export type { CoachPage } from './coach.ts'
export * from './common.ts'
export type { DeadFeeds, DeadFeedsPage } from './dead-feeds.ts'
export type { ExportPage } from './export.ts'
export type { FatalPage } from './fatal.ts'
export type { FeedsPage } from './feeds.ts'
export type { HistoryPage } from './history.ts'
export type { HomePage } from './home.ts'
export type { ImportPage } from './import.ts'
export type { LaterPage } from './later.ts'
export type { MenuPage } from './menu.ts'
export type { ReloginPage } from './relogin.ts'
export type { SignUpPage } from './sign-up.ts'
export type { StartPage } from './start.ts'
export type { StoragePage } from './storage.ts'
export type { WelcomePage } from './welcome.ts'

export const pages = {
  about: aboutPage,
  accounts: accountsPage,
  add: addPage,
  categories: categoriesPage,
  cloud: cloudPage,
  coach: coachPage,
  deadFeeds: deadFeedsPage,
  network: createSimplePage('network'),
  export: exportPage,
  fast: fastPage,
  fatal: fatalPage,
  feeds: createRedirectPage('feeds', 'add'),
  history: historyPage,
  home: homePage,
  import: importPage,
  interface: createSimplePage('interface'),
  later: laterPage,
  menu: menuPage,
  posts: createSimplePage('posts'),
  relogin: reloginPage,
  root: createRedirectPage('root', 'home'),
  settings: createRedirectPage('settings', 'interface'),
  signUp: signUpPage,
  slow: slowPage,
  start: startPage,
  storage: storagePage,
  welcome: welcomePage
} satisfies {
  [Name in RouteName]: Name extends 'fast' | 'slow'
    ? PageCreator<'fast' | 'slow'>
    : PageCreator<Name>
}

export type Pages = typeof pages

export type Page<Name extends RouteName> = ReturnType<Pages[Name]>
