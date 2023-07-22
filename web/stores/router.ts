import {
  type ConfigFromRouter,
  createRouter,
  getPagePath,
  type ParamsArg
} from '@nanostores/router'
import { router, setBaseRouter } from '@slowreader/core'

let urlRouter = createRouter({
  add: '/add',
  fast: '/fast',
  home: '/',
  notFound: '/404',
  preview: '/add/:url',
  signin: '/signin',
  slowAll: '/slow',
  start: '/start',
  subscriptions: '/subscriptions'
})

setBaseRouter(urlRouter)

router.subscribe(page => {
  if (page.redirect) {
    let href
    if (page.route === 'preview') {
      href = getPagePath(urlRouter, page.route, page.params)
    } else {
      href = getPagePath(urlRouter, page.route)
    }
    urlRouter.open(href)
  }
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
