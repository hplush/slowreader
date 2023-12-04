import {
  type ConfigFromRouter,
  createRouter,
  getPagePath,
  type ParamsArg
} from '@nanostores/router'

export const urlRouter = createRouter({
  about: '/settings/about',
  add: '/add',
  fast: '/fast',
  feed: '/feeds/:id',
  feeds: '/feeds',
  home: '/',
  interface: '/settings/ui',
  notFound: '/404',
  preview: '/add/:url',
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

export function openURL<Name extends keyof UrlConfig>(
  name: Name,
  ...params: ParamsArg<UrlConfig, Name>
): void {
  urlRouter.open(getURL(name, ...params))
}
