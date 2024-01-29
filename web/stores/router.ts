import {
  type ConfigFromRouter,
  createRouter,
  getPagePath,
  type ParamsArg
} from '@nanostores/router'
import type { BaseRoute } from '@slowreader/core'

export const urlRouter = createRouter({
  about: '/settings/about',
  add: '/feeds/add/:url?',
  categories: '/feeds/categories/:feed?',
  download: '/settings/download',
  fast: '/fast/:category?/:since?/:post?',
  feeds: '/feeds',
  home: '/',
  interface: '/settings/ui',
  notFound: '/404',
  profile: '/settings/profile',
  refresh: '/refresh',
  settings: '/settings',
  signin: '/signin',
  slowAll: '/slow',
  start: '/start',
  subscriptions: '/subscriptions',
  welcome: '/welcome'
})

type UrlConfig = ConfigFromRouter<typeof urlRouter>

export function getURL<Name extends keyof UrlConfig>(
  name: Name,
  ...params: ParamsArg<UrlConfig, Name>
): string {
  return getPagePath(urlRouter, name, ...params)
}

export function openRoute(route: BaseRoute): void {
  urlRouter.open(getPagePath(urlRouter, route))
}
