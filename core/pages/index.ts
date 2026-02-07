import type { RouteName } from '../router.ts'
import { aboutPage } from './about.ts'
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
import { profilePage } from './profile.ts'
import { signupPage } from './signup.ts'
import { startPage } from './start.ts'

export type { AboutPage } from './about.ts'
export type { AddPage } from './add.ts'
export * from './common.ts'
export type { ExportPage } from './export.ts'
export type { FeedsByCategoriesPage } from './feeds-by-categories.ts'
export type { FeedsPage } from './feeds.ts'
export type { HomePage } from './home.ts'
export type { ImportPage } from './import.ts'
export type { ProfilePage } from './profile.ts'
export type { SignupPage } from './signup.ts'
export type { StartPage } from './start.ts'

export const pages = {
  about: aboutPage,
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
  outdated: createSimplePage('outdated'),
  profile: profilePage,
  settings: createRedirectPage('settings', 'interface'),
  signin: createSimplePage('signin'),
  signup: signupPage,
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
